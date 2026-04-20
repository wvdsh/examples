// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "Pong",
    dependencies: [
        .package(url: "https://github.com/swiftwasm/JavaScriptKit.git", from: "0.30.0"),
    ],
    targets: [
        .executableTarget(
            name: "Pong",
            dependencies: [
                .product(name: "JavaScriptKit", package: "JavaScriptKit"),
                .product(name: "JavaScriptEventLoop", package: "JavaScriptKit"),
            ]
        )
    ]
)
