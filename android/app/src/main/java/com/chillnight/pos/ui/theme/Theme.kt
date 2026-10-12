package com.chillnight.pos.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkSlate900 = Color(0xFF0F172A)
val DarkSlate800 = Color(0xFF1E293B)
val DarkSlate700 = Color(0xFF334155)
val OrangePrimary = Color(0xFFF97316)
val OrangeDark = Color(0xFFEA580C)
val GreenSuccess = Color(0xFF22C55E)
val RedDanger = Color(0xFFEF4444)
val YellowWarning = Color(0xFFEAB308)
val TextLight = Color(0xFFF8FAFC)
val TextMuted = Color(0xFF94A3B8)

private val DarkColorScheme = darkColorScheme(
    primary = OrangePrimary,
    onPrimary = Color.White,
    primaryContainer = OrangeDark,
    onPrimaryContainer = Color.White,
    secondary = GreenSuccess,
    onSecondary = Color.White,
    background = DarkSlate900,
    onBackground = TextLight,
    surface = DarkSlate800,
    onSurface = TextLight,
    surfaceVariant = DarkSlate700,
    onSurfaceVariant = TextLight,
    error = RedDanger,
    onError = Color.White
)

@Composable
fun ChillNightTheme(
    darkTheme: Boolean = true, // POS app designed in dark theme for restaurant readability
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
