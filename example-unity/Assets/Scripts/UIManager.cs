using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

public class UIManager : MonoBehaviour
{
    [SerializeField] GameObject menuPanel;
    [SerializeField] GameObject onlinePanel;
    [SerializeField] GameObject hudPanel;
    [SerializeField] TMP_Text leftScoreText;
    [SerializeField] TMP_Text rightScoreText;
    [SerializeField] TMP_Text leftNameText;
    [SerializeField] TMP_Text rightNameText;
    [SerializeField] Button playLocalButton;
    [SerializeField] Button playOnlineButton;
    [SerializeField] TMP_Text startPromptText;
    [SerializeField] Button createLobbyButton;
    [SerializeField] Button backButton;
    [SerializeField] Transform lobbyListContent;

    void Awake()
    {
        playLocalButton.onClick.AddListener(() => GameManager.Instance.StartLocalGame());
        playOnlineButton.onClick.AddListener(() => GameManager.Instance.StartOnlineGame());
        createLobbyButton.onClick.AddListener(() => GameManager.Instance.CreateLobby());
        backButton.onClick.AddListener(() => ShowMenu());
    }

    public void ShowMenu()
    {
        menuPanel.SetActive(true);
        onlinePanel.SetActive(false);
        hudPanel.SetActive(false);
    }

    public void ShowOnlinePanel()
    {
        menuPanel.SetActive(false);
        onlinePanel.SetActive(true);
        hudPanel.SetActive(false);
    }

    public void ShowGame()
    {
        menuPanel.SetActive(false);
        onlinePanel.SetActive(false);
        hudPanel.SetActive(true);
        HideStartPrompt();
    }

    public void ShowStartPrompt(string text)
    {
        startPromptText.text = text;
        startPromptText.gameObject.SetActive(true);
    }

    public void HideStartPrompt()
    {
        startPromptText.gameObject.SetActive(false);
    }

    public void UpdateScores(int left, int right)
    {
        leftScoreText.text = left.ToString();
        rightScoreText.text = right.ToString();
    }

    public void SetPlayerNames(string left, string right)
    {
        leftNameText.text = left;
        rightNameText.text = right;
    }

    public void PopulateLobbyList(List<Dictionary<string, object>> lobbies)
    {
        ClearLobbyList();

        if (lobbies == null || lobbies.Count == 0)
        {
            AddLobbyLabel("No lobbies found");
            return;
        }

        foreach (var lobby in lobbies)
        {
            string lobbyId = lobby["lobbyId"]?.ToString();
            string title = "Untitled Lobby";

            if (lobby.TryGetValue("metadata", out var metaObj))
            {
                if (metaObj is JObject jObj)
                    title = jObj.Value<string>("title") ?? title;
                else if (metaObj is Dictionary<string, object> dict && dict.ContainsKey("title"))
                    title = dict["title"]?.ToString() ?? title;
            }

            AddLobbyButton(lobbyId, title);
        }
    }

    void ClearLobbyList()
    {
        for (int i = lobbyListContent.childCount - 1; i >= 0; i--)
            Destroy(lobbyListContent.GetChild(i).gameObject);
    }

    void AddLobbyButton(string lobbyId, string title)
    {
        var go = new GameObject("LobbyItem");
        go.transform.SetParent(lobbyListContent, false);

        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 44;

        var image = go.AddComponent<Image>();
        image.color = new Color(0.15f, 0.15f, 0.15f, 1f);

        var btn = go.AddComponent<Button>();
        btn.targetGraphic = image;
        var colors = btn.colors;
        colors.highlightedColor = new Color(0.25f, 0.25f, 0.25f, 1f);
        colors.pressedColor = new Color(0.1f, 0.1f, 0.1f, 1f);
        btn.colors = colors;

        string id = lobbyId;
        btn.onClick.AddListener(() => Wavedash.SDK.JoinLobby(id));

        var textGO = new GameObject("Text");
        textGO.transform.SetParent(go.transform, false);
        var textRect = textGO.AddComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = new Vector2(10, 0);
        textRect.offsetMax = new Vector2(-10, 0);
        var tmp = textGO.AddComponent<TextMeshProUGUI>();
        tmp.text = title;
        tmp.fontSize = 18;
        tmp.color = Color.white;
        tmp.alignment = TextAlignmentOptions.Left;
        tmp.verticalAlignment = VerticalAlignmentOptions.Middle;
        tmp.raycastTarget = false;
    }

    void AddLobbyLabel(string text)
    {
        var go = new GameObject("Label");
        go.transform.SetParent(lobbyListContent, false);
        var rect = go.AddComponent<RectTransform>();
        rect.sizeDelta = new Vector2(0, 44);
        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = 18;
        tmp.color = new Color(1, 1, 1, 0.5f);
        tmp.alignment = TextAlignmentOptions.Center;
        tmp.verticalAlignment = VerticalAlignmentOptions.Middle;
    }
}
