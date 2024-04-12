use std::process::{Command, Stdio};

fn main() {
    // we only want the build script to rerun if we make changes to the webapps and they need
    // to be recompiled or rebuilt in order for the nodejs process to pick them up
    println!("cargo::rerun-if-changed=../../ui/AdminWebApp/src");
    println!("cargo::rerun-if-changed=../../ui/WebGLViewer/src");
    println!("cargo::warning=BUILDING LEGACY DEEPLYNX");

    Command::new("yarn")
        .args(["install"])
        .current_dir("../legacy")
        .stdout(Stdio::inherit())
        .output()
        .expect("failed to install dependencies for legacy deeplynx");

    Command::new("yarn")
        .args(["run", "build"])
        .current_dir("../legacy")
        .stdout(Stdio::inherit())
        .output()
        .expect("failed to run the build step for legacy deeplynx");
}
