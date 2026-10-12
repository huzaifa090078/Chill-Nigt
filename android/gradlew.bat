@rem ==========================================================================
@rem Chill Night POS Gradle Wrapper Script for Windows
@rem ==========================================================================
@echo off
setlocal

if not defined JAVA_HOME (
    set "JAVA_HOME=C:\Users\Al hamad\AppData\Local\Programs\jdk-21.0.6+7"
)

set GRADLE_BIN=C:\Users\Al hamad\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3\bin\gradle.bat

if exist "%GRADLE_BIN%" (
    call "%GRADLE_BIN%" %*
) else (
    echo Gradle binary not found at %GRADLE_BIN%
    exit /b 1
)
