using UnityEngine;

public enum Side { Left, Right }

public class GoalZone : MonoBehaviour
{
    [SerializeField] Side scoringSide;

    void OnTriggerEnter2D(Collider2D other)
    {
        if (other.CompareTag("Ball"))
        {
            GameManager.Instance.OnGoalScored(scoringSide);
        }
    }
}
