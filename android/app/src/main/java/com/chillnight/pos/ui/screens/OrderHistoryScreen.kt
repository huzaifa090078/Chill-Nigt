package com.chillnight.pos.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chillnight.pos.model.Order
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    viewModel: AppViewModel,
    onNavigateToOrderDetail: (String) -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val currentFilter by viewModel.selectedStatusFilter.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val isLoading by viewModel.isLoadingOrders.collectAsState()

    var searchInput by remember { mutableStateOf(searchQuery) }

    LaunchedEffect(Unit) {
        viewModel.loadOrders()
    }

    val filterOptions = listOf(
        "ALL" to "All",
        "CONFIRMED" to "Confirmed",
        "PREPARING" to "Preparing",
        "READY" to "Ready",
        "OUT_FOR_DELIVERY" to "Out for Delivery",
        "DELIVERED" to "Delivered",
        "CANCELLED" to "Cancelled"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order History", fontWeight = FontWeight.Bold, color = TextLight) },
                actions = {
                    IconButton(onClick = { viewModel.loadOrders() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = OrangePrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlate800)
            )
        },
        containerColor = DarkSlate900
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Input Bar
            OutlinedTextField(
                value = searchInput,
                onValueChange = {
                    searchInput = it
                    viewModel.setSearchQuery(it)
                },
                placeholder = { Text("Search by name, phone, or order #...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = OrangePrimary) },
                trailingIcon = {
                    if (searchInput.isNotEmpty()) {
                        IconButton(onClick = {
                            searchInput = ""
                            viewModel.setSearchQuery("")
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = TextMuted)
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = OrangePrimary,
                    unfocusedBorderColor = DarkSlate700
                )
            )

            // Status Filter Chips
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filterOptions) { (key, label) ->
                    FilterChip(
                        selected = currentFilter == key,
                        onClick = { viewModel.setStatusFilter(key) },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OrangePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            // Orders List
            if (orders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isLoading) "Loading orders..." else "No matching orders found",
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(orders) { order ->
                        OrderCard(order = order, onClick = { onNavigateToOrderDetail(order.id) })
                    }
                    item { Spacer(modifier = Modifier.height(30.dp)) }
                }
            }
        }
    }
}

@Composable
fun OrderCard(
    order: Order,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "#${order.orderNumber}",
                        fontWeight = FontWeight.ExtraBold,
                        color = OrangePrimary,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = order.customerName,
                        fontWeight = FontWeight.Bold,
                        color = TextLight,
                        fontSize = 15.sp
                    )
                }
                StatusBadge(status = order.status)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "${order.orderType} • ${order.customerPhone}",
                color = TextMuted,
                fontSize = 12.sp
            )

            if (order.deliveryAddress != null) {
                Text(
                    text = "📍 ${order.deliveryAddress}",
                    color = TextMuted,
                    fontSize = 11.sp,
                    maxLines = 1
                )
            }

            Divider(color = DarkSlate700, modifier = Modifier.padding(vertical = 8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Payment: ${order.paymentStatus} (${order.paymentMethod})",
                    fontSize = 12.sp,
                    color = if (order.paymentStatus == "PAID") GreenSuccess else YellowWarning,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Rs. ${order.totalAmount.toInt()}",
                    fontWeight = FontWeight.ExtraBold,
                    color = TextLight,
                    fontSize = 16.sp
                )
            }
        }
    }
}
