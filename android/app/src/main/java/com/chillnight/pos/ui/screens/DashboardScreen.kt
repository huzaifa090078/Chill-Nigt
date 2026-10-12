package com.chillnight.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chillnight.pos.model.Order
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: AppViewModel,
    onNavigateToNewOrder: () -> Unit,
    onNavigateToOrderDetail: (String) -> Unit
) {
    val stats by viewModel.dashboardStats.collectAsState()
    val isLoading by viewModel.isLoadingStats.collectAsState()
    val owner by viewModel.ownerInfo.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadDashboardStats()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = owner?.restaurantName ?: "Chill Night Food Point",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = TextLight
                        )
                        Text(
                            text = "Today: ${stats?.todayDatePkt ?: "Loading..."} (PKT)",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadDashboardStats() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = OrangePrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlate800)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToNewOrder,
                containerColor = OrangePrimary,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("New Order", fontWeight = FontWeight.Bold) }
            )
        },
        containerColor = DarkSlate900
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Metrics Grid (4 Stat Cards)
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(
                        title = "Today's Orders",
                        value = "${stats?.todayOrdersCount ?: 0}",
                        icon = Icons.Default.Receipt,
                        color = OrangePrimary,
                        modifier = Modifier.weight(1f)
                    )
                    MetricCard(
                        title = "Today's Sales",
                        value = "Rs. ${stats?.todaySalesTotal?.toInt() ?: 0}",
                        icon = Icons.Default.Payments,
                        color = GreenSuccess,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(
                        title = "Pending Kitchen",
                        value = "${stats?.pendingOrdersCount ?: 0}",
                        icon = Icons.Default.Kitchen,
                        color = YellowWarning,
                        modifier = Modifier.weight(1f)
                    )
                    MetricCard(
                        title = "Completed",
                        value = "${stats?.completedOrdersCount ?: 0}",
                        icon = Icons.Default.CheckCircle,
                        color = Color(0xFF38BDF8),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Quick POS Action Banner
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigateToNewOrder() },
                    colors = CardDefaults.cardColors(containerColor = OrangePrimary.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(12.dp),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(OrangePrimary))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Take New Customer Order",
                                fontWeight = FontWeight.Bold,
                                color = TextLight,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "Delivery / Takeaway with WhatsApp link",
                                color = TextMuted,
                                fontSize = 12.sp
                            )
                        }
                        Icon(
                            Icons.Default.ArrowForward,
                            contentDescription = null,
                            tint = OrangePrimary
                        )
                    }
                }
            }

            // Recent Orders Header
            item {
                Text(
                    text = "Recent Orders",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextLight,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            val recentList = stats?.recentOrders ?: emptyList()
            if (recentList.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No orders created yet today", color = TextMuted, fontSize = 14.sp)
                        }
                    }
                }
            } else {
                items(recentList) { order ->
                    RecentOrderRow(order = order, onClick = { onNavigateToOrderDetail(order.id) })
                }
            }

            // Extra space for FAB
            item {
                Spacer(modifier = Modifier.height(60.dp))
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    color = TextMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Icon(
                    icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = value,
                color = TextLight,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

@Composable
fun RecentOrderRow(
    order: Order,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${order.orderNumber}",
                        fontWeight = FontWeight.Bold,
                        color = OrangePrimary,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = order.customerName,
                        fontWeight = FontWeight.SemiBold,
                        color = TextLight,
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${order.orderType} • ${order.paymentMethod}",
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Rs. ${order.totalAmount.toInt()}",
                    fontWeight = FontWeight.Bold,
                    color = TextLight,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                StatusBadge(status = order.status)
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val (bg, fg) = when (status) {
        "CONFIRMED" -> Color(0xFF0284C7).copy(alpha = 0.2f) to Color(0xFF38BDF8)
        "PREPARING" -> OrangePrimary.copy(alpha = 0.2f) to OrangePrimary
        "READY" -> GreenSuccess.copy(alpha = 0.2f) to GreenSuccess
        "OUT_FOR_DELIVERY" -> Color(0xFFA855F7).copy(alpha = 0.2f) to Color(0xFFC084FC)
        "DELIVERED" -> GreenSuccess.copy(alpha = 0.2f) to GreenSuccess
        "CANCELLED" -> RedDanger.copy(alpha = 0.2f) to RedDanger
        else -> DarkSlate700 to TextMuted
    }

    Surface(
        color = bg,
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = status.replace("_", " "),
            color = fg,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}
