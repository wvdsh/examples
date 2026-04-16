using Unity.Netcode;
using UnityEngine;

public class PaddleController : NetworkBehaviour
{
    [SerializeField] KeyCode upKey = KeyCode.W;
    [SerializeField] KeyCode downKey = KeyCode.S;
    [SerializeField] float speed = 8f;
    [SerializeField] float yMin = -4f;
    [SerializeField] float yMax = 4f;

    Rigidbody2D rb;
    bool isOnline;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    public void SetOnline(bool online)
    {
        isOnline = online;
    }

    void FixedUpdate()
    {
        if (isOnline)
        {
            // Online: only owner controls, accept W/S or Up/Down
            if (!IsSpawned || !IsOwner) return;

            float direction = 0f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) direction += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) direction -= 1f;

            Vector2 newPos = rb.position + Vector2.up * direction * speed * Time.fixedDeltaTime;
            newPos.y = Mathf.Clamp(newPos.y, yMin, yMax);
            rb.MovePosition(newPos);
        }
        else
        {
            // Local: use configured keys
            float direction = 0f;
            if (Input.GetKey(upKey)) direction += 1f;
            if (Input.GetKey(downKey)) direction -= 1f;

            Vector2 newPos = rb.position + Vector2.up * direction * speed * Time.fixedDeltaTime;
            newPos.y = Mathf.Clamp(newPos.y, yMin, yMax);
            rb.MovePosition(newPos);
        }
    }
}
