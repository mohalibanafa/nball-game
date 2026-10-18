cmake_minimum_required(VERSION 3.10)
project(nball_native CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(SDL2 REQUIRED)

include_directories(${SDL2_INCLUDE_DIRS})

add_executable(nball_native main.cpp)

target_link_libraries(nball_native ${SDL2_LIBRARIES})

if (WIN32)
    target_link_libraries(nball_native opengl32)
elseif (ANDROID)
    target_link_libraries(nball_native GLESv2 log)
endif()
