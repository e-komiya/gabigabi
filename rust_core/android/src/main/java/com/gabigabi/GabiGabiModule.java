package com.gabigabi;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableNativeArray;
import androidx.annotation.NonNull;

public class GabiGabiModule extends ReactContextBaseJavaModule {

    public GabiGabiModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return "GabiGabi";
    }

    @ReactMethod
    public void resize(ReadableArray inputBytes, double scalePct, Promise promise) {
        try {
            // Convert ReadableArray to byte[]
            byte[] input = new byte[inputBytes.size()];
            for (int i = 0; i < inputBytes.size(); i++) {
                input[i] = (byte) inputBytes.getInt(i);
            }

            byte[] result = RustCore.resize(input, (float) scalePct);
            
            if (result == null) {
                promise.reject("RESIZE_ERROR", "Failed to resize image");
                return;
            }

            // Convert byte[] to WritableArray
            WritableNativeArray output = new WritableNativeArray();
            for (byte b : result) {
                output.pushInt(b & 0xFF); // Convert to unsigned
            }
            
            promise.resolve(output);
        } catch (Exception e) {
            promise.reject("RESIZE_ERROR", e.getMessage());
        }
    }
} 