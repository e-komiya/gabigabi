#include <jni.h>
#include <string>
#include <vector>

extern "C" {
    // Rust function signature
    uint8_t* rust_resize(const uint8_t* data, size_t len, float scale_pct, size_t* out_len);
    void rust_free_buffer(uint8_t* ptr);
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_gabigabi_RustCore_resize(
    JNIEnv *env,
    jobject /* this */,
    jbyteArray input_bytes,
    jfloat scale_pct) {

    jsize input_len = env->GetArrayLength(input_bytes);
    jbyte* input_data = env->GetByteArrayElements(input_bytes, nullptr);
    
    size_t output_len = 0;
    uint8_t* output_data = rust_resize(
        reinterpret_cast<const uint8_t*>(input_data),
        static_cast<size_t>(input_len),
        scale_pct,
        &output_len
    );

    env->ReleaseByteArrayElements(input_bytes, input_data, JNI_ABORT);

    if (output_data == nullptr) {
        return nullptr; // Error occurred
    }

    jbyteArray result = env->NewByteArray(static_cast<jsize>(output_len));
    env->SetByteArrayRegion(result, 0, static_cast<jsize>(output_len),
                            reinterpret_cast<const jbyte*>(output_data));
    
    rust_free_buffer(output_data);
    return result;
} 