#![allow(unsafe_code)]
#![forbid(rust_2018_idioms)]

//! Core image resize library for convert2gabigabi.
//! 現状はバイト列入力・倍率(%)指定でリサイズした JPEG/PNG バイト列を返す。

use image::{DynamicImage, GenericImageView, ImageFormat};
use std::io::Cursor;
use std::slice;

/// Resize the image bytes by `scale_pct` (e.g., 50.0 = 50%) keeping aspect ratio.
/// Returns heavily compressed "gabigabi" image bytes.
pub fn resize(data: &[u8], scale_pct: f32) -> anyhow::Result<Vec<u8>> {
    if !(0.0 < scale_pct && scale_pct <= 100.0) {
        anyhow::bail!("scale_pct must be within (0,100]");
    }
    // Decode image
    let img = image::load_from_memory(data)?;
    let (w, h) = img.dimensions();
    let nw = ((w as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    let nh = ((h as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    
    // Use Lanczos3 for more aggressive downsampling artifacts
    let resized = img.resize_exact(nw, nh, image::imageops::FilterType::Lanczos3);
    
    // Convert to RGB to reduce color information
    let rgb_img = resized.to_rgb8();
    
    // Apply color quantization (reduce color palette)
    let quantized = apply_color_quantization(rgb_img);
    
    // Encode with very low quality JPEG compression (quality 10)
    let mut buf = Vec::new();
    encode_gabigabi_jpeg(&quantized, &mut buf)?;
    
    Ok(buf)
}

/// Encode image as heavily compressed JPEG with quality 10
fn encode_gabigabi_jpeg(img: &image::RgbImage, output: &mut Vec<u8>) -> anyhow::Result<()> {
    let (width, height) = img.dimensions();
    let raw_data: Vec<u8> = img.as_raw().clone();
    
    let encoder = jpeg_encoder::Encoder::new(output, 10); // Quality 10 (very low)
    encoder.encode(&raw_data, width as u16, height as u16, jpeg_encoder::ColorType::Rgb)?;
    Ok(())
}

/// Apply aggressive color quantization to create "gabigabi" effect
fn apply_color_quantization(mut img: image::RgbImage) -> image::RgbImage {
    let (width, height) = img.dimensions();
    
    for y in 0..height {
        for x in 0..width {
            let pixel = img.get_pixel_mut(x, y);
            // Reduce each color channel to fewer bits (create posterization effect)
            pixel[0] = (pixel[0] / 32) * 32;  // Red: 8 levels
            pixel[1] = (pixel[1] / 32) * 32;  // Green: 8 levels  
            pixel[2] = (pixel[2] / 32) * 32;  // Blue: 8 levels
        }
    }
    
    img
}

/// Resize the image bytes by `scale_pct` with specified gabigabi level.
/// gabigabi_level: 1=軽微, 2=普通, 3=重め, 4=極重, 5=破壊レベル
pub fn resize_gabigabi(data: &[u8], scale_pct: f32, gabigabi_level: u8) -> anyhow::Result<Vec<u8>> {
    if !(0.0 < scale_pct && scale_pct <= 100.0) {
        anyhow::bail!("scale_pct must be within (0,100]");
    }
    if !(1..=5).contains(&gabigabi_level) {
        anyhow::bail!("gabigabi_level must be 1-5");
    }
    
    // Decode image
    let img = image::load_from_memory(data)?;
    let (w, h) = img.dimensions();
    let nw = ((w as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    let nh = ((h as f32) * scale_pct / 100.0).round().max(1.0) as u32;
    
    // Use different filters based on gabigabi level
    let filter = match gabigabi_level {
        1 => image::imageops::FilterType::Triangle,
        2 => image::imageops::FilterType::Lanczos3,
        3 => image::imageops::FilterType::Nearest, // More pixelated
        4 => image::imageops::FilterType::Nearest,
        5 => image::imageops::FilterType::Nearest,
        _ => unreachable!()
    };
    
    let resized = img.resize_exact(nw, nh, filter);
    
    // Convert to RGB
    let rgb_img = resized.to_rgb8();
    
    // Apply color quantization based on level
    let quantized = apply_color_quantization_level(rgb_img, gabigabi_level);
    
    // Encode with quality based on level
    let quality = match gabigabi_level {
        1 => 40,  // 軽微
        2 => 20,  // 普通
        3 => 10,  // 重め
        4 => 5,   // 極重
        5 => 1,   // 破壊レベル
        _ => unreachable!()
    };
    
    let mut buf = Vec::new();
    encode_gabigabi_jpeg_quality(&quantized, &mut buf, quality)?;
    
    Ok(buf)
}

/// Apply color quantization with different intensity levels
fn apply_color_quantization_level(mut img: image::RgbImage, level: u8) -> image::RgbImage {
    let (width, height) = img.dimensions();
    
    let quantization_factor = match level {
        1 => 16,  // 16 levels per channel
        2 => 32,  // 8 levels per channel  
        3 => 64,  // 4 levels per channel
        4 => 85,  // 3 levels per channel
        5 => 128, // 2 levels per channel
        _ => 32
    };
    
    for y in 0..height {
        for x in 0..width {
            let pixel = img.get_pixel_mut(x, y);
            pixel[0] = (pixel[0] / quantization_factor) * quantization_factor;
            pixel[1] = (pixel[1] / quantization_factor) * quantization_factor;
            pixel[2] = (pixel[2] / quantization_factor) * quantization_factor;
        }
    }
    
    img
}

/// Encode image as JPEG with specified quality
fn encode_gabigabi_jpeg_quality(img: &image::RgbImage, output: &mut Vec<u8>, quality: u8) -> anyhow::Result<()> {
    let (width, height) = img.dimensions();
    let raw_data: Vec<u8> = img.as_raw().clone();
    
    let encoder = jpeg_encoder::Encoder::new(output, quality);
    encoder.encode(&raw_data, width as u16, height as u16, jpeg_encoder::ColorType::Rgb)?;
    Ok(())
}

/// C-compatible resize function for FFI
#[no_mangle]
pub extern "C" fn rust_resize(
    data: *const u8,
    len: usize,
    scale_pct: f32,
    out_len: *mut usize,
) -> *mut u8 {
    if data.is_null() || out_len.is_null() {
        return std::ptr::null_mut();
    }
    
    let input_slice = unsafe { slice::from_raw_parts(data, len) };
    
    match resize(input_slice, scale_pct) {
        Ok(result) => {
            let result_len = result.len();
            let result_ptr = Box::into_raw(result.into_boxed_slice()) as *mut u8;
            unsafe { *out_len = result_len; }
            result_ptr
        }
        Err(_) => std::ptr::null_mut(),
    }
}

/// Free memory allocated by rust_resize
#[no_mangle]
pub extern "C" fn rust_free_buffer(ptr: *mut u8) {
    if !ptr.is_null() {
        unsafe {
            let _ = Box::from_raw(ptr);
        }
    }
}

fn detect_format(data: &[u8]) -> anyhow::Result<ImageFormat> {
    image::guess_format(data).map_err(|e| anyhow::anyhow!(e))
} 