using Unity.Netcode;
using UnityEngine;

/// <summary>
/// Thin RPC layer for game events. Host sends authoritative events to clients.
/// Ball physics runs locally on both clients — only discrete events are networked.
/// </summary>
public class GameEvents : NetworkBehaviour
{
    public void SendLaunchBall(Vector2 direction, float speed)
    {
        LaunchBallClientRpc(direction, speed);
    }

    [ClientRpc]
    void LaunchBallClientRpc(Vector2 direction, float speed)
    {
        if (IsServer) return; // Host already launched locally
        GameManager.Instance.OnRemoteLaunchBall(direction, speed);
    }

    public void SendBallHitPaddle(Vector2 velocity)
    {
        BallHitPaddleClientRpc(velocity);
    }

    [ClientRpc]
    void BallHitPaddleClientRpc(Vector2 velocity)
    {
        if (IsServer) return; // Host already applied locally
        GameManager.Instance.OnRemoteBallHitPaddle(velocity);
    }

    public void SendGoalScored(int leftScore, int rightScore)
    {
        GoalScoredClientRpc(leftScore, rightScore);
    }

    [ClientRpc]
    void GoalScoredClientRpc(int leftScore, int rightScore)
    {
        if (IsServer) return; // Host already handled locally
        GameManager.Instance.OnRemoteGoalScored(leftScore, rightScore);
    }
}
