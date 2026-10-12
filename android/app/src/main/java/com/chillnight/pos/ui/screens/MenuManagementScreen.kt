package com.chillnight.pos.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chillnight.pos.model.Category
import com.chillnight.pos.model.MenuItem
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuManagementScreen(viewModel: AppViewModel) {
    val categories by viewModel.categories.collectAsState()
    val menuItems by viewModel.menuItems.collectAsState()

    var selectedCatId by remember { mutableStateOf<String?>(null) }
    var showAddItemDialog by remember { mutableStateOf(false) }
    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var itemToEdit by remember { mutableStateOf<MenuItem?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadCategories()
        viewModel.loadMenuItems()
    }

    val filteredItems = if (selectedCatId == null) {
        menuItems
    } else {
        menuItems.filter { it.categoryId == selectedCatId }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Menu Management", fontWeight = FontWeight.Bold, color = TextLight) },
                actions = {
                    TextButton(onClick = { showAddCategoryDialog = true }) {
                        Text("+ Category", color = OrangePrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlate800)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddItemDialog = true },
                containerColor = OrangePrimary,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Item", fontWeight = FontWeight.Bold) }
            )
        },
        containerColor = DarkSlate900
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Categories Horizontal Filter
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCatId == null,
                        onClick = { selectedCatId = null },
                        label = { Text("All (${menuItems.size})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OrangePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCatId == cat.id,
                        onClick = { selectedCatId = cat.id },
                        label = { Text(cat.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OrangePrimary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            // Items List
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredItems) { item ->
                    MenuItemCard(
                        item = item,
                        onToggleAvail = { viewModel.toggleItemAvailability(item.id, item.isAvailable) },
                        onEdit = { itemToEdit = item },
                        onDelete = { viewModel.deleteMenuItem(item.id) }
                    )
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    // Add Category Dialog
    if (showAddCategoryDialog) {
        var catName by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAddCategoryDialog = false },
            containerColor = DarkSlate800,
            title = { Text("New Category", color = TextLight, fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(
                    value = catName,
                    onValueChange = { catName = it },
                    label = { Text("Category Name") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (catName.isNotBlank()) {
                            viewModel.addCategory(catName) { showAddCategoryDialog = false }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary)
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddCategoryDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }

    // Add / Edit Menu Item Dialog
    if (showAddItemDialog || itemToEdit != null) {
        val editing = itemToEdit
        var name by remember { mutableStateOf(editing?.name ?: "") }
        var desc by remember { mutableStateOf(editing?.description ?: "") }
        var price by remember { mutableStateOf(editing?.price?.toInt()?.toString() ?: "") }
        var catId by remember { mutableStateOf(editing?.categoryId ?: categories.firstOrNull()?.id ?: "") }

        AlertDialog(
            onDismissRequest = {
                showAddItemDialog = false
                itemToEdit = null
            },
            containerColor = DarkSlate800,
            title = {
                Text(
                    text = if (editing != null) "Edit Menu Item" else "New Menu Item",
                    color = TextLight,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Select Category:", fontSize = 12.sp, color = TextMuted)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(categories) { c ->
                            FilterChip(
                                selected = catId == c.id,
                                onClick = { catId = c.id },
                                label = { Text(c.name, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = OrangePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Food Item Name") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = price,
                        onValueChange = { price = it },
                        label = { Text("Price (PKR)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = desc,
                        onValueChange = { desc = it },
                        label = { Text("Description (Optional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val numPrice = price.toDoubleOrNull() ?: 0.0
                        if (name.isNotBlank() && catId.isNotBlank() && numPrice > 0) {
                            if (editing != null) {
                                viewModel.updateMenuItem(editing.id, catId, name, desc, numPrice) {
                                    itemToEdit = null
                                }
                            } else {
                                viewModel.addMenuItem(catId, name, desc, numPrice) {
                                    showAddItemDialog = false
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary)
                ) {
                    Text("Save Item")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddItemDialog = false
                    itemToEdit = null
                }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}

@Composable
fun MenuItemCard(
    item: MenuItem,
    onToggleAvail: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val isAvailable = item.isAvailable == 1
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.categoryName ?: "",
                    fontSize = 11.sp,
                    color = OrangePrimary,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = item.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isAvailable) TextLight else TextMuted
                )
                if (!item.description.isNullOrBlank()) {
                    Text(
                        text = item.description,
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Rs. ${item.price.toInt()}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = GreenSuccess
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (isAvailable) "In Stock" else "Out",
                        fontSize = 11.sp,
                        color = if (isAvailable) GreenSuccess else RedDanger
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Switch(
                        checked = isAvailable,
                        onCheckedChange = { onToggleAvail() },
                        colors = SwitchDefaults.colors(checkedThumbColor = GreenSuccess)
                    )
                }
                Row {
                    IconButton(onClick = onEdit) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = TextMuted, modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = RedDanger, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
