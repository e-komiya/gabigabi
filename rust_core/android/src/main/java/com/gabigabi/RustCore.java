package com.gabigabi;

public class RustCore {
    static {
        System.loadLibrary("gabigabi_bridge");
    }

    /**
     * Resize image bytes by scale percentage.
     * @param inputBytes Input image bytes (JPEG/PNG)
     * @param scalePct Scale percentage (e.g., 50.0 for 50%)
     * @return Resized image bytes, or null if error
     */
    public static native byte[] resize(byte[] inputBytes, float scalePct);
} 