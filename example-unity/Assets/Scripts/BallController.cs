using UnityEngine;

public class BallController : MonoBehaviour
{
    [SerializeField] float initialSpeed = 7f;
    [SerializeField] float speedIncrease = 0.5f;
    [SerializeField] float maxSpeed = 15f;

    Rigidbody2D rb;
    float currentSpeed;

    public float InitialSpeed => initialSpeed;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    public void Launch(Vector2 direction, float speed)
    {
        currentSpeed = speed;
        rb.linearVelocity = direction * speed;
    }

    public void ResetBall()
    {
        rb.linearVelocity = Vector2.zero;
        transform.position = Vector3.zero;
    }

    public void ApplyVelocity(Vector2 velocity)
    {
        currentSpeed = velocity.magnitude;
        rb.linearVelocity = velocity;
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.GetComponent<PaddleController>() != null)
        {
            currentSpeed = Mathf.Min(currentSpeed + speedIncrease, maxSpeed);
            Vector2 vel = rb.linearVelocity;
            float awayDir = Mathf.Sign(transform.position.x - collision.transform.position.x);
            vel.x = Mathf.Abs(vel.x) * awayDir;
            rb.linearVelocity = vel.normalized * currentSpeed;

            // Host sends authoritative result to client
            GameManager.Instance.OnBallHitPaddle(rb.linearVelocity);
        }
        else
        {
            // Wall bounce — both clients compute locally, no sync needed
            rb.linearVelocity = rb.linearVelocity.normalized * currentSpeed;
        }
    }
}
