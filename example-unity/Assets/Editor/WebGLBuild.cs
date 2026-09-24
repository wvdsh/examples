using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;

// Command-line WebGL build:
//   unity build . --target WebGL --execute-method WebGLBuild.Build -o Build/index
public static class WebGLBuild
{
    public static void Build()
    {
        string[] args = Environment.GetCommandLineArgs();
        int i = Array.IndexOf(args, "-buildOutput");
        string output = i >= 0 && i + 1 < args.Length ? args[i + 1] : "Build/index";

        var options = new BuildPlayerOptions
        {
            scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
            locationPathName = output,
            target = BuildTarget.WebGL,
            options = BuildOptions.None,
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
            EditorApplication.Exit(1);
    }
}
