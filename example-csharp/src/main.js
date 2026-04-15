// Stub entry point required by WasmMainJSPath.
// The actual game entry is web/game.js which imports _framework/dotnet.js directly.
import { dotnet } from "./_framework/dotnet.js";

const { getAssemblyExports } = await dotnet.create();
const exports = await getAssemblyExports("Pong.dll");
