using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using Unity.Netcode;
using Unity.Netcode.Components;
using TMPro;

public static class PongSceneSetup
{
    [MenuItem("Pong/Setup Scene")]
    public static void SetupScene()
    {
        EditorSceneManager.OpenScene("Assets/Scenes/SampleScene.unity");
        var scene = EditorSceneManager.GetActiveScene();

        // Keep existing Camera and Global Light 2D, destroy everything else
        foreach (var go in scene.GetRootGameObjects())
        {
            if (go.name != "Main Camera" && go.name != "Global Light 2D")
                Object.DestroyImmediate(go);
        }

        // Configure camera background to black
        Camera cam = null;
        foreach (var go in scene.GetRootGameObjects())
        {
            cam = go.GetComponent<Camera>();
            if (cam != null) break;
        }
        if (cam != null)
        {
            cam.backgroundColor = Color.black;
            cam.clearFlags = CameraClearFlags.SolidColor;
        }

        // Load sprites from 2D sprite package
        var square = AssetDatabase.LoadAssetAtPath<Sprite>(
            "Packages/com.unity.2d.sprite/Editor/ObjectMenuCreation/DefaultAssets/Textures/v2/Square.png");
        var circle = AssetDatabase.LoadAssetAtPath<Sprite>(
            "Packages/com.unity.2d.sprite/Editor/ObjectMenuCreation/DefaultAssets/Textures/v2/Circle.png");

        // Create or load physics material
        var bounceMat = AssetDatabase.LoadAssetAtPath<PhysicsMaterial2D>(
            "Assets/Settings/BounceMaterial.physicsMaterial2D");
        if (bounceMat == null)
        {
            bounceMat = new PhysicsMaterial2D("BounceMaterial")
            {
                friction = 0f,
                bounciness = 1f
            };
            AssetDatabase.CreateAsset(bounceMat, "Assets/Settings/BounceMaterial.physicsMaterial2D");
        }

        // ── Play Field ──────────────────────────────────────────────
        var playField = new GameObject("PlayField");

        var topWall = CreateSprite("TopWall", square, new Vector3(0, 5.25f, 0), new Vector3(18, 0.5f, 1));
        topWall.transform.SetParent(playField.transform);
        topWall.AddComponent<BoxCollider2D>().sharedMaterial = bounceMat;

        var bottomWall = CreateSprite("BottomWall", square, new Vector3(0, -5.25f, 0), new Vector3(18, 0.5f, 1));
        bottomWall.transform.SetParent(playField.transform);
        bottomWall.AddComponent<BoxCollider2D>().sharedMaterial = bounceMat;

        var leftGoal = new GameObject("LeftGoal");
        leftGoal.transform.SetParent(playField.transform);
        leftGoal.transform.position = new Vector3(-11, 0, 0);
        leftGoal.transform.localScale = new Vector3(1, 50, 1);
        leftGoal.AddComponent<BoxCollider2D>().isTrigger = true;
        var lgz = leftGoal.AddComponent<GoalZone>();
        SetSerializedInt(lgz, "scoringSide", 1); // Side.Right

        var rightGoal = new GameObject("RightGoal");
        rightGoal.transform.SetParent(playField.transform);
        rightGoal.transform.position = new Vector3(11, 0, 0);
        rightGoal.transform.localScale = new Vector3(1, 50, 1);
        rightGoal.AddComponent<BoxCollider2D>().isTrigger = true;
        var rgz = rightGoal.AddComponent<GoalZone>();
        SetSerializedInt(rgz, "scoringSide", 0); // Side.Left

        var centerLine = CreateSprite("CenterLine", square, Vector3.zero, new Vector3(0.05f, 10, 1));
        centerLine.transform.SetParent(playField.transform);
        centerLine.GetComponent<SpriteRenderer>().color = new Color(1, 1, 1, 0.3f);

        // ── Left Paddle ─────────────────────────────────────────────
        var leftPaddle = CreateSprite("LeftPaddle", square,
            new Vector3(-8.5f, 0, 0), new Vector3(0.3f, 2, 1));
        SetupKinematicBody(leftPaddle);
        leftPaddle.AddComponent<BoxCollider2D>();
        leftPaddle.AddComponent<NetworkObject>().DontDestroyWithOwner = true;
        ConfigureNetworkTransform2D(leftPaddle.AddComponent<NetworkTransform>());
        var lpc = leftPaddle.AddComponent<PaddleController>();

        // ── Right Paddle ────────────────────────────────────────────
        var rightPaddle = CreateSprite("RightPaddle", square,
            new Vector3(8.5f, 0, 0), new Vector3(0.3f, 2, 1));
        SetupKinematicBody(rightPaddle);
        rightPaddle.AddComponent<BoxCollider2D>();
        rightPaddle.AddComponent<NetworkObject>().DontDestroyWithOwner = true;
        ConfigureNetworkTransform2D(rightPaddle.AddComponent<NetworkTransform>(), ownerAuth: true);
        var rpc = rightPaddle.AddComponent<PaddleController>();
        var rpSO = new SerializedObject(rpc);
        rpSO.FindProperty("upKey").intValue = (int)KeyCode.UpArrow;
        rpSO.FindProperty("downKey").intValue = (int)KeyCode.DownArrow;
        rpSO.ApplyModifiedPropertiesWithoutUndo();

        // ── Ball ────────────────────────────────────────────────────
        var ball = CreateSprite("Ball", circle, Vector3.zero, new Vector3(0.3f, 0.3f, 1));
        ball.tag = "Ball";
        var ballRb = ball.AddComponent<Rigidbody2D>();
        ballRb.gravityScale = 0;
        ballRb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        ballRb.freezeRotation = true;
        ballRb.interpolation = RigidbodyInterpolation2D.Interpolate;
        ball.AddComponent<CircleCollider2D>().sharedMaterial = bounceMat;
        var bc = ball.AddComponent<BallController>();

        // ── Canvas ──────────────────────────────────────────────────
        var canvasGO = new GameObject("Canvas");
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(960, 600);
        scaler.matchWidthOrHeight = 0.5f;
        canvasGO.AddComponent<GraphicRaycaster>();

        // Menu Panel
        var menuPanel = new GameObject("MenuPanel");
        menuPanel.transform.SetParent(canvasGO.transform, false);
        StretchRectTransform(menuPanel.AddComponent<RectTransform>());
        var menuBg = menuPanel.AddComponent<Image>();
        menuBg.color = new Color(0, 0, 0, 0.85f);

        CreateText("TitleText", menuPanel.transform, "PONG", 72,
            new Vector2(0, 100), new Vector2(400, 100));
        var localBtnGO = CreateButton("PlayLocalButton", menuPanel.transform,
            "Play Local", new Vector2(0, 0), new Vector2(200, 50));
        var onlineBtnGO = CreateButton("PlayOnlineButton", menuPanel.transform,
            "Play Online", new Vector2(0, -70), new Vector2(200, 50));

        // ── Online Panel ────────────────────────────────────────────
        var onlinePanel = new GameObject("OnlinePanel");
        onlinePanel.transform.SetParent(canvasGO.transform, false);
        StretchRectTransform(onlinePanel.AddComponent<RectTransform>());
        var onlineBg = onlinePanel.AddComponent<Image>();
        onlineBg.color = new Color(0, 0, 0, 0.85f);
        onlinePanel.SetActive(false);

        // Back button — top-left
        var backBtnGO = CreateButton("BackButton", onlinePanel.transform,
            "< Back", new Vector2(0, 0), new Vector2(120, 40));
        var backRect = backBtnGO.GetComponent<RectTransform>();
        backRect.anchorMin = new Vector2(0, 1);
        backRect.anchorMax = new Vector2(0, 1);
        backRect.pivot = new Vector2(0, 1);
        backRect.anchoredPosition = new Vector2(20, -20);

        // Online title — top-center
        CreateText("OnlineTitleText", onlinePanel.transform, "ONLINE PLAY", 36,
            new Vector2(0, -30), new Vector2(400, 50));
        // Reanchor to top-center
        var onlineTitleRect = onlinePanel.transform.Find("OnlineTitleText").GetComponent<RectTransform>();
        onlineTitleRect.anchorMin = new Vector2(0.5f, 1);
        onlineTitleRect.anchorMax = new Vector2(0.5f, 1);
        onlineTitleRect.pivot = new Vector2(0.5f, 1);

        // Create Lobby button — left side, vertically centered
        var createLobbyBtnGO = CreateButton("CreateLobbyButton", onlinePanel.transform,
            "Create Lobby", new Vector2(0, 0), new Vector2(200, 50));
        var createRect = createLobbyBtnGO.GetComponent<RectTransform>();
        createRect.anchorMin = new Vector2(0.25f, 0.5f);
        createRect.anchorMax = new Vector2(0.25f, 0.5f);
        createRect.anchoredPosition = Vector2.zero;

        // Lobby list label — right side header
        var lobbyListLabel = CreateText("LobbyListLabel", onlinePanel.transform,
            "Available Lobbies", 22, Vector2.zero, new Vector2(400, 30));
        var llRect = lobbyListLabel.GetComponent<RectTransform>();
        llRect.anchorMin = new Vector2(0.5f, 1);
        llRect.anchorMax = new Vector2(1, 1);
        llRect.pivot = new Vector2(0.5f, 1);
        llRect.anchoredPosition = new Vector2(0, -80);
        llRect.sizeDelta = new Vector2(-40, 30);

        // Lobby list scroll view — right half below label
        var scrollGO = new GameObject("LobbyScrollView");
        scrollGO.transform.SetParent(onlinePanel.transform, false);
        var scrollRect = scrollGO.AddComponent<RectTransform>();
        scrollRect.anchorMin = new Vector2(0.5f, 0);
        scrollRect.anchorMax = new Vector2(1, 1);
        scrollRect.pivot = new Vector2(0.5f, 0.5f);
        scrollRect.offsetMin = new Vector2(20, 20);
        scrollRect.offsetMax = new Vector2(-20, -115);
        var scrollImage = scrollGO.AddComponent<Image>();
        scrollImage.color = new Color(0.08f, 0.08f, 0.08f, 1f);
        var scrollView = scrollGO.AddComponent<ScrollRect>();
        scrollView.horizontal = false;

        // Viewport
        var viewportGO = new GameObject("Viewport");
        viewportGO.transform.SetParent(scrollGO.transform, false);
        var vpRect = viewportGO.AddComponent<RectTransform>();
        StretchRectTransform(vpRect);
        viewportGO.AddComponent<Image>().color = Color.white;
        var mask = viewportGO.AddComponent<Mask>();
        mask.showMaskGraphic = false;

        // Content
        var contentGO = new GameObject("Content");
        contentGO.transform.SetParent(viewportGO.transform, false);
        var contentRect = contentGO.AddComponent<RectTransform>();
        contentRect.anchorMin = new Vector2(0, 1);
        contentRect.anchorMax = new Vector2(1, 1);
        contentRect.pivot = new Vector2(0.5f, 1);
        contentRect.sizeDelta = new Vector2(0, 0);
        var vlg = contentGO.AddComponent<VerticalLayoutGroup>();
        vlg.spacing = 4;
        vlg.padding = new RectOffset(6, 6, 8, 6);
        vlg.childForceExpandWidth = true;
        vlg.childForceExpandHeight = false;
        vlg.childControlWidth = true;
        vlg.childControlHeight = true;
        var csf = contentGO.AddComponent<ContentSizeFitter>();
        csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        scrollView.viewport = vpRect;
        scrollView.content = contentRect;

        // HUD Panel
        var hudPanel = new GameObject("HUDPanel");
        hudPanel.transform.SetParent(canvasGO.transform, false);
        StretchRectTransform(hudPanel.AddComponent<RectTransform>());

        var leftScoreGO = CreateText("LeftScoreText", hudPanel.transform, "0", 48,
            new Vector2(-100, 255), new Vector2(100, 60));
        var rightScoreGO = CreateText("RightScoreText", hudPanel.transform, "0", 48,
            new Vector2(100, 255), new Vector2(100, 60));
        var leftNameGO = CreateText("LeftNameText", hudPanel.transform, "", 20,
            new Vector2(-100, 220), new Vector2(200, 30));
        var rightNameGO = CreateText("RightNameText", hudPanel.transform, "", 20,
            new Vector2(100, 220), new Vector2(200, 30));
        var startPromptGO = CreateText("StartPromptText", hudPanel.transform, "", 32,
            new Vector2(0, 0), new Vector2(400, 50));
        startPromptGO.SetActive(false);

        // ── Event System ────────────────────────────────────────────
        var eventSystemGO = new GameObject("EventSystem");
        eventSystemGO.AddComponent<EventSystem>();
        eventSystemGO.AddComponent<StandaloneInputModule>();

        // ── NetworkManager ──────────────────────────────────────────
        var nmGO = new GameObject("NetworkManager");
        var nm = nmGO.AddComponent<NetworkManager>();
        var wt = nmGO.AddComponent<WavedashTransport>();
        nm.NetworkConfig.NetworkTransport = wt;

        // ── GameEvents ──────────────────────────────────────────────
        var gameEventsGO = new GameObject("GameEvents");
        gameEventsGO.AddComponent<NetworkObject>().DontDestroyWithOwner = true;
        var ge = gameEventsGO.AddComponent<GameEvents>();

        // ── GameManager ─────────────────────────────────────────────
        var gmGO = new GameObject("GameManager");
        var gm = gmGO.AddComponent<GameManager>();

        // ── UIManager (on Canvas) ───────────────────────────────────
        var uiMgr = canvasGO.AddComponent<UIManager>();

        // ── Wire serialized references ──────────────────────────────
        var gmSO = new SerializedObject(gm);
        gmSO.FindProperty("ball").objectReferenceValue = bc;
        gmSO.FindProperty("uiManager").objectReferenceValue = uiMgr;
        gmSO.FindProperty("leftPaddle").objectReferenceValue = lpc;
        gmSO.FindProperty("rightPaddle").objectReferenceValue = rpc;
        gmSO.FindProperty("gameEvents").objectReferenceValue = ge;
        gmSO.FindProperty("wavedashTransport").objectReferenceValue = wt;
        gmSO.ApplyModifiedPropertiesWithoutUndo();

        var uiSO = new SerializedObject(uiMgr);
        uiSO.FindProperty("menuPanel").objectReferenceValue = menuPanel;
        uiSO.FindProperty("onlinePanel").objectReferenceValue = onlinePanel;
        uiSO.FindProperty("hudPanel").objectReferenceValue = hudPanel;
        uiSO.FindProperty("leftScoreText").objectReferenceValue =
            leftScoreGO.GetComponent<TMP_Text>();
        uiSO.FindProperty("rightScoreText").objectReferenceValue =
            rightScoreGO.GetComponent<TMP_Text>();
        uiSO.FindProperty("leftNameText").objectReferenceValue =
            leftNameGO.GetComponent<TMP_Text>();
        uiSO.FindProperty("rightNameText").objectReferenceValue =
            rightNameGO.GetComponent<TMP_Text>();
        uiSO.FindProperty("startPromptText").objectReferenceValue =
            startPromptGO.GetComponent<TMP_Text>();
        uiSO.FindProperty("createLobbyButton").objectReferenceValue =
            createLobbyBtnGO.GetComponent<Button>();
        uiSO.FindProperty("backButton").objectReferenceValue =
            backBtnGO.GetComponent<Button>();
        uiSO.FindProperty("lobbyListContent").objectReferenceValue =
            contentGO.transform;
        uiSO.FindProperty("playLocalButton").objectReferenceValue =
            localBtnGO.GetComponent<Button>();
        uiSO.FindProperty("playOnlineButton").objectReferenceValue =
            onlineBtnGO.GetComponent<Button>();
        uiSO.ApplyModifiedPropertiesWithoutUndo();

        // Save
        EditorSceneManager.MarkSceneDirty(scene);
        EditorSceneManager.SaveOpenScenes();
        Debug.Log("Pong scene setup complete!");
    }

    static void ConfigureNetworkTransform2D(NetworkTransform nt, bool ownerAuth = false)
    {
        var so = new SerializedObject(nt);
        if (ownerAuth)
            so.FindProperty("AuthorityMode").intValue = 1; // Owner
        so.FindProperty("SyncPositionZ").boolValue = false;
        so.FindProperty("SyncRotAngleX").boolValue = false;
        so.FindProperty("SyncRotAngleY").boolValue = false;
        so.FindProperty("SyncRotAngleZ").boolValue = false;
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    static GameObject CreateSprite(string name, Sprite sprite, Vector3 pos, Vector3 scale)
    {
        var go = new GameObject(name);
        go.transform.position = pos;
        go.transform.localScale = scale;
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = sprite;
        return go;
    }

    static void SetupKinematicBody(GameObject go)
    {
        var rb = go.AddComponent<Rigidbody2D>();
        rb.bodyType = RigidbodyType2D.Kinematic;
        rb.freezeRotation = true;
        rb.interpolation = RigidbodyInterpolation2D.Interpolate;
    }

    static GameObject CreateText(string name, Transform parent, string text, float fontSize,
        Vector2 anchoredPos, Vector2 size)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.pivot = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = size;
        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = fontSize;
        tmp.color = Color.white;
        tmp.alignment = TextAlignmentOptions.Center;
        return go;
    }

    static GameObject CreateButton(string name, Transform parent, string label,
        Vector2 anchoredPos, Vector2 size)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var rect = go.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.pivot = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = size;
        var image = go.AddComponent<Image>();
        image.color = new Color(0.2f, 0.2f, 0.2f, 1f);
        var btn = go.AddComponent<Button>();
        btn.targetGraphic = image;

        // Button label as child
        var textGO = new GameObject("Text");
        textGO.transform.SetParent(go.transform, false);
        StretchRectTransform(textGO.AddComponent<RectTransform>());
        var tmp = textGO.AddComponent<TextMeshProUGUI>();
        tmp.text = label;
        tmp.fontSize = 24;
        tmp.color = Color.white;
        tmp.alignment = TextAlignmentOptions.Center;

        return go;
    }

    static void StretchRectTransform(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
    }

    static void SetSerializedInt(Object target, string property, int value)
    {
        var so = new SerializedObject(target);
        so.FindProperty(property).intValue = value;
        so.ApplyModifiedPropertiesWithoutUndo();
    }
}
