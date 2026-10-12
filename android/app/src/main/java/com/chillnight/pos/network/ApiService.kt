package com.chillnight.pos.network

import com.chillnight.pos.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("api/auth/login")
    suspend fun login(@Body req: LoginRequest): Response<LoginResponse>

    @GET("api/dashboard/stats")
    suspend fun getDashboardStats(): Response<DashboardStats>

    @GET("api/menu/categories")
    suspend fun getCategories(): Response<List<Category>>

    @POST("api/menu/categories")
    suspend fun addCategory(@Body body: Map<String, Any>): Response<Category>

    @GET("api/menu/items")
    suspend fun getMenuItems(@Query("categoryId") categoryId: String? = null): Response<List<MenuItem>>

    @POST("api/menu/items")
    suspend fun addMenuItem(@Body body: Map<String, Any>): Response<MenuItem>

    @PUT("api/menu/items/{id}")
    suspend fun updateMenuItem(@Path("id") id: String, @Body body: Map<String, Any>): Response<MenuItem>

    @PATCH("api/menu/items/{id}/availability")
    suspend fun toggleItemAvailability(@Path("id") id: String, @Body body: Map<String, Any>): Response<Map<String, Any>>

    @DELETE("api/menu/items/{id}")
    suspend fun deleteMenuItem(@Path("id") id: String): Response<Map<String, Any>>

    @GET("api/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 100
    ): Response<List<Order>>

    @GET("api/orders/{id}")
    suspend fun getOrderById(@Path("id") id: String): Response<Order>

    @POST("api/orders")
    suspend fun createOrder(@Body req: CreateOrderRequest): Response<Order>

    @PATCH("api/orders/{id}/status")
    suspend fun updateOrderStatus(@Path("id") id: String, @Body req: UpdateStatusRequest): Response<Order>

    @PATCH("api/orders/{id}/payment")
    suspend fun updateOrderPayment(@Path("id") id: String, @Body req: UpdatePaymentRequest): Response<Order>

    @PATCH("api/orders/{id}/estimate")
    suspend fun addEstimateMinutes(@Path("id") id: String, @Body req: AddEstimateRequest): Response<Order>
}
