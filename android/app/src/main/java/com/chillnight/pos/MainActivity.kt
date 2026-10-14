package com.chillnight.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.chillnight.pos.ui.screens.*
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object NewOrder : Screen("new_order", "New Order", Icons.Default.AddCircle)
    object Menu : Screen("menu", "Menu", Icons.Default.RestaurantMenu)
    object Orders : Screen("orders", "Orders", Icons.Default.ReceiptLong)
}

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ChillNightTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainAppContent(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun MainAppContent(viewModel: AppViewModel) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val navItems = listOf(
        Screen.Dashboard,
        Screen.NewOrder,
        Screen.Menu,
        Screen.Orders
    )

    val showBottomBar = currentRoute in navItems.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = DarkSlate800
                ) {
                    navItems.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = OrangePrimary,
                                selectedTextColor = OrangePrimary,
                                indicatorColor = DarkSlate700,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            )
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    viewModel = viewModel,
                    onNavigateToNewOrder = { navController.navigate(Screen.NewOrder.route) },
                    onNavigateToOrderDetail = { orderId -> navController.navigate("order_detail/$orderId") }
                )
            }
            composable(Screen.NewOrder.route) {
                CreateOrderScreen(
                    viewModel = viewModel,
                    onOrderCreatedNavigate = { orderId -> navController.navigate("order_detail/$orderId") }
                )
            }
            composable(Screen.Menu.route) {
                MenuManagementScreen(viewModel = viewModel)
            }
            composable(Screen.Orders.route) {
                OrderHistoryScreen(
                    viewModel = viewModel,
                    onNavigateToOrderDetail = { orderId -> navController.navigate("order_detail/$orderId") }
                )
            }
            composable(
                route = "order_detail/{orderId}",
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                OrderDetailScreen(
                    orderId = orderId,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
