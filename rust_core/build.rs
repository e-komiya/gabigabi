use std::env;

fn main() {
    let target = env::var("TARGET").unwrap();
    
    if target.contains("android") {
        println!("cargo:rustc-link-lib=log");
    }
    
    // Generate cbindgen headers for C++ bridge
    if cbindgen::generate("./").is_ok() {
        // cbindgen will generate header files
    }
} 