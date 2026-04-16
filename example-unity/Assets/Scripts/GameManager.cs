using UnityEngine;
using Unity.Netcode;
using System.Collections.Generic;

public class GameManager : MonoBehaviour
{
    [SerializeField] BallController ball;
    [SerializeField] UIManager uiManager;
    [SerializeField] PaddleController leftPaddle;
    [SerializeField] PaddleController rightPaddle;
    [SerializeField] GameEvents gameEvents;
    [SerializeField] WavedashTransport wavedashTransport;

    int leftScore;
    int rightScore;
    bool gameActive;
    bool isOnlineGame;
    string currentLobbyId;
    bool isHost;
    bool waitingForStart;

    public static GameManager Instance { get; private set; }

    void Awake()
    {
        Instance = this;
        Wavedash.SDK.Init(new Dictionary<string, object> { { "debug", true } });
    }

    void Start()
    {
        leftPaddle.enabled = false;
        rightPaddle.enabled = false;
        ball.ResetBall();
        uiManager.ShowMenu();
    }

    void OnEnable()
    {
        Wavedash.SDK.OnLobbyJoined += OnLobbyJoined;
        Wavedash.SDK.OnLobbyUsersUpdated += OnLobbyUsersUpdated;
        Wavedash.SDK.OnP2PConnectionEstablished += OnP2PConnectionEstablished;
        if (wavedashTransport != null)
            wavedashTransport.OnHostMigration += OnHostMigration;
    }

    void OnDisable()
    {
        Wavedash.SDK.OnLobbyJoined -= OnLobbyJoined;
        Wavedash.SDK.OnLobbyUsersUpdated -= OnLobbyUsersUpdated;
        Wavedash.SDK.OnP2PConnectionEstablished -= OnP2PConnectionEstablished;
        if (wavedashTransport != null)
            wavedashTransport.OnHostMigration -= OnHostMigration;
    }

    void Update()
    {
        if (waitingForStart && Input.GetMouseButtonDown(0))
        {
            waitingForStart = false;
            uiManager.HideStartPrompt();
            gameActive = true;
            LaunchBall();
            return;
        }

        if (gameActive)
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                if (isOnlineGame)
                    LeaveOnlineGame();
                else
                    ReturnToMenu();
                return;
            }

            if (isOnlineGame && !isHost) return;
            float bx = ball.transform.position.x;
            if (bx < -13f)
                OnGoalScored(Side.Right);
            else if (bx > 13f)
                OnGoalScored(Side.Left);
        }
    }

    // ── Shared State ────────────────────────────────────────────

    void ResetMatchState()
    {
        gameActive = false;
        waitingForStart = false;
        leftScore = 0;
        rightScore = 0;
        uiManager.HideStartPrompt();
        uiManager.UpdateScores(0, 0);
        ball.ResetBall();
        leftPaddle.transform.position = new Vector3(-8.5f, 0f, 0f);
        rightPaddle.transform.position = new Vector3(8.5f, 0f, 0f);
    }

    void ShutdownNGO()
    {
        var nm = NetworkManager.Singleton;
        if (nm == null) return;
        nm.OnClientConnectedCallback -= OnNGOClientConnected;
        nm.OnClientDisconnectCallback -= OnNGOClientDisconnected;
        if (nm.IsListening)
            nm.Shutdown();
    }

    void StartNGO()
    {
        var nm = NetworkManager.Singleton;
        if (nm == null) return;

        // Ensure clean state — idempotent unsubscribe before subscribe
        nm.OnClientConnectedCallback -= OnNGOClientConnected;
        nm.OnClientDisconnectCallback -= OnNGOClientDisconnected;
        nm.OnClientConnectedCallback += OnNGOClientConnected;
        nm.OnClientDisconnectCallback += OnNGOClientDisconnected;

        if (isHost)
            nm.StartHost();
        else
            nm.StartClient();
    }

    // ── Local Game ──────────────────────────────────────────────

    public void StartLocalGame()
    {
        isOnlineGame = false;
        ResetMatchState();
        uiManager.ShowGame();

        leftPaddle.enabled = true;
        rightPaddle.enabled = true;

        string username = Wavedash.SDK.GetUsername();
        uiManager.SetPlayerNames(
            string.IsNullOrEmpty(username) ? "Player" : username,
            "Guest");

        gameActive = true;
        LaunchBall();
    }

    // ── Online Lobby ────────────────────────────────────────────

    public async void StartOnlineGame()
    {
        uiManager.ShowOnlinePanel();
        await RefreshLobbies();
    }

    public async void CreateLobby()
    {
        string lobbyId = await Wavedash.SDK.CreateLobby(
            WavedashConstants.LobbyVisibility.PUBLIC, 2);
        if (string.IsNullOrEmpty(lobbyId))
        {
            Debug.LogWarning("Failed to create lobby");
            return;
        }

        string username = Wavedash.SDK.GetUsername();
        if (!string.IsNullOrEmpty(username))
            Wavedash.SDK.SetLobbyData(lobbyId, "title", username);
    }

    void EnterOnlineGame()
    {
        // Clean up any previous NGO session
        ShutdownNGO();

        isOnlineGame = true;
        ResetMatchState();
        uiManager.ShowGame();

        leftPaddle.SetOnline(true);
        rightPaddle.SetOnline(true);
        leftPaddle.enabled = true;
        rightPaddle.enabled = true;

        string myName = Wavedash.SDK.GetUsername() ?? "Player";

        if (isHost)
            uiManager.SetPlayerNames(myName, "Waiting...");
        else
            uiManager.SetPlayerNames("Connecting...", myName);

        // Defer NGO start to next frame so Shutdown completes fully
        Invoke(nameof(StartNGO), 0f);
    }

    // ── Wavedash Events ─────────────────────────────────────────

    void OnLobbyJoined(Dictionary<string, object> data)
    {
        currentLobbyId = data["lobbyId"]?.ToString();
        string hostId = data["hostId"]?.ToString();
        isHost = hostId == Wavedash.SDK.GetUserId();
        EnterOnlineGame();
    }

    void OnLobbyUsersUpdated(Dictionary<string, object> data)
    {
        if (!isOnlineGame || currentLobbyId == null || !isHost) return;

        int numUsers = Wavedash.SDK.GetNumLobbyUsers(currentLobbyId);
        if (numUsers >= 2 && !gameActive && !waitingForStart)
        {
            string myName = Wavedash.SDK.GetUsername() ?? "Player";
            uiManager.SetPlayerNames(myName, "Connecting...");
        }
    }

    void OnP2PConnectionEstablished(Dictionary<string, object> data)
    {
        if (!isOnlineGame) return;

        string peerId = data["userId"]?.ToString();
        string peerName = GetPeerUsername(peerId);
        string myName = Wavedash.SDK.GetUsername() ?? "Player";

        if (isHost)
        {
            uiManager.SetPlayerNames(myName, peerName);
        }
        else
        {
            uiManager.SetPlayerNames(peerName, myName);
            uiManager.ShowStartPrompt("Waiting for host...");
        }
    }

    // ── NGO Events ──────────────────────────────────────────────

    void OnNGOClientConnected(ulong clientId)
    {
        if (!isHost || !isOnlineGame) return;
        var nm = NetworkManager.Singleton;
        if (nm == null || clientId == nm.LocalClientId) return;

        var rightNetObj = rightPaddle != null ? rightPaddle.GetComponent<NetworkObject>() : null;
        if (rightNetObj != null && rightNetObj.IsSpawned)
            rightNetObj.ChangeOwnership(clientId);

        waitingForStart = true;
        uiManager.ShowStartPrompt("Click to Start");
    }

    void OnNGOClientDisconnected(ulong clientId)
    {
        if (!isOnlineGame) return;
        var nm = NetworkManager.Singleton;
        if (nm != null && clientId == nm.LocalClientId) return;

        ResetMatchState();

        if (isHost)
        {
            string myName = Wavedash.SDK.GetUsername() ?? "Player";
            uiManager.SetPlayerNames(myName, "Waiting...");
        }
    }

    void OnHostMigration(string newHostId)
    {
        if (!isOnlineGame) return;

        string myId = Wavedash.SDK.GetUserId();
        bool becameHost = !isHost && (newHostId == myId);
        isHost = newHostId == myId;

        ResetMatchState();

        if (becameHost)
        {
            Debug.Log("[GameManager] I am the new host, restarting as host");
            ShutdownNGO();

            string myName = Wavedash.SDK.GetUsername() ?? "Player";
            uiManager.SetPlayerNames(myName, "Waiting...");

            // Restart as host next frame
            Invoke(nameof(StartNGO), 0f);
        }
    }

    // ── Ball Events ─────────────────────────────────────────────

    void LaunchBall()
    {
        float xDir = Random.value > 0.5f ? 1f : -1f;
        float angle = Random.Range(-30f, 30f) * Mathf.Deg2Rad;
        Vector2 dir = new Vector2(xDir * Mathf.Cos(angle), Mathf.Sin(angle)).normalized;
        float speed = ball.InitialSpeed;

        ball.Launch(dir, speed);

        if (isOnlineGame)
            gameEvents.SendLaunchBall(dir, speed);
    }

    public void OnBallHitPaddle(Vector2 velocity)
    {
        if (!isOnlineGame || !isHost) return;
        gameEvents.SendBallHitPaddle(velocity);
    }

    public void OnRemoteLaunchBall(Vector2 direction, float speed)
    {
        uiManager.HideStartPrompt();
        gameActive = true;
        ball.Launch(direction, speed);
    }

    public void OnRemoteBallHitPaddle(Vector2 velocity)
    {
        ball.ApplyVelocity(velocity);
    }

    public void OnRemoteGoalScored(int left, int right)
    {
        leftScore = left;
        rightScore = right;
        ball.ResetBall();
        uiManager.UpdateScores(left, right);
    }

    // ── Scoring ─────────────────────────────────────────────────

    public void OnGoalScored(Side scoringSide)
    {
        if (!gameActive) return;
        if (isOnlineGame && !isHost) return;

        if (scoringSide == Side.Left)
            leftScore++;
        else
            rightScore++;

        ball.ResetBall();
        uiManager.UpdateScores(leftScore, rightScore);

        if (isOnlineGame)
            gameEvents.SendGoalScored(leftScore, rightScore);

        LaunchBall();
    }

    // ── Helpers ──────────────────────────────────────────────────

    string GetPeerUsername(string peerId)
    {
        return Wavedash.SDK.GetUsername(peerId) ?? "Unknown";
    }

    async System.Threading.Tasks.Task RefreshLobbies()
    {
        var lobbies = await Wavedash.SDK.ListAvailableLobbies();
        uiManager.PopulateLobbyList(lobbies);
    }

    // ── Cleanup ─────────────────────────────────────────────────

    async void LeaveOnlineGame()
    {
        if (!isOnlineGame) return;
        isOnlineGame = false;
        gameActive = false;
        waitingForStart = false;

        ShutdownNGO();

        leftPaddle.SetOnline(false);
        rightPaddle.SetOnline(false);
        leftPaddle.enabled = false;
        rightPaddle.enabled = false;
        ball.ResetBall();
        uiManager.ShowMenu();

        if (currentLobbyId != null)
        {
            string lobbyId = currentLobbyId;
            currentLobbyId = null;
            await Wavedash.SDK.LeaveLobby(lobbyId);
        }
    }

    void ReturnToMenu()
    {
        gameActive = false;
        leftPaddle.enabled = false;
        rightPaddle.enabled = false;
        ball.ResetBall();
        uiManager.ShowMenu();
    }
}
