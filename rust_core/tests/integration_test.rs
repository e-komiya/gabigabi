use rust_core::resize;

// Test with a proper PNG file
const SAMPLE_PNG: &[u8] = include_bytes!("sample.png");

#[test]
fn test_resize_50_percent() {
    let result = resize(SAMPLE_PNG, 50.0);
    assert!(result.is_ok(), "Resize should succeed. Error: {:?}", result.err());
    let output = result.unwrap();
    assert!(!output.is_empty(), "Output should not be empty");
}

#[test]
fn test_resize_invalid_scale() {
    let result = resize(SAMPLE_PNG, 0.0);
    assert!(result.is_err(), "Should fail with 0% scale");
    
    let result = resize(SAMPLE_PNG, -10.0);
    assert!(result.is_err(), "Should fail with negative scale");
}

#[test]
fn test_resize_ffi_functions() {
    use rust_core::{rust_resize, rust_free_buffer};
    
    let mut out_len: usize = 0;
    let result_ptr = rust_resize(
        SAMPLE_PNG.as_ptr(),
        SAMPLE_PNG.len(),
        75.0,
        &mut out_len as *mut usize,
    );
    
    assert!(!result_ptr.is_null(), "FFI resize should return valid pointer");
    assert!(out_len > 0, "Output length should be positive");
    
    // Free the allocated memory
    rust_free_buffer(result_ptr);
} 