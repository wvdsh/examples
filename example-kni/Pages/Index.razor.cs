using System;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Microsoft.Xna.Framework;

namespace Pong.Pages
{
    public partial class Index
    {
        [Parameter] public string Path { get; set; }

        Game _game;

        protected override async void OnAfterRender(bool firstRender)
        {
            base.OnAfterRender(firstRender);

            if (firstRender)
            {
                try
                {
                    await JsRuntime.InvokeVoidAsync("wavedashUpdateLoadProgress", 1.0);
                    await JsRuntime.InvokeVoidAsync("wavedashInit");
                }
                catch (System.Exception ex)
                {
                    System.Console.WriteLine($"[example-kni] SDK call failed: {ex.Message}");
                }

                await JsRuntime.InvokeAsync<object>("initRenderJS", DotNetObjectReference.Create(this));
            }
        }

        [JSInvokable]
        public void TickDotNet()
        {
            // init game
            if (_game == null)
            {
                _game = new PongGame();
                _game.Run();
            }

            // run gameloop
            _game.Tick();
        }

    }
}
