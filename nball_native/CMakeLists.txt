cmake_minimum_required(VERSION 3.10)
project(nball_native CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(SDL2 REQUIRED)

add_executable(nball_native main.cpp)

if (TARGET SDL2::SDL2)
    target_link_libraries(nball_native PRIVATE SDL2::SDL2)
    if (TARGET SDL2::SDL2main)
        target_link_libraries(nball_native PRIVATE SDL2::SDL2main)
    endif()
else()
    include_directories(${SDL2_INCLUDE_DIRS})
    target_link_libraries(nball_native PRIVATE ${SDL2_LIBRARIES})
endif()

if (WIN32)
    target_link_libraries(nball_native PRIVATE opengl32)
elseif (ANDROID)
    target_link_libraries(nball_native PRIVATE GLESv2 log)
endif()
