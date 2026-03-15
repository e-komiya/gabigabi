cmake_minimum_required(VERSION 3.18.1)

project("rustcore")

add_library(rustcore SHARED IMPORTED)
set_target_properties(rustcore PROPERTIES IMPORTED_LOCATION
    ${CMAKE_CURRENT_SOURCE_DIR}/../target/${ANDROID_ABI}/release/librust_core.so)

add_library(
    gabigabi_bridge
    SHARED
    src/main/cpp/bridge.cpp
)

find_library(log-lib log)

target_link_libraries(
    gabigabi_bridge
    rustcore
    ${log-lib}
) 