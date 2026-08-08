from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.clients.views import ClientViewSet
from apps.invoices.views import InvoiceViewSet
from apps.reminders.views import ReminderViewSet
from apps.users.views import RegisterView, LoginView, ProfileView, UserListView, AdminResetPasswordView

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/register/', RegisterView.as_view(), name='register'),
    path('api/v1/auth/login/', LoginView.as_view(), name='login'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/profile/', ProfileView.as_view(), name='profile'),
    path('api/v1/auth/users/', UserListView.as_view(), name='user_list'),
    path('api/v1/auth/admin/reset-user-password/', AdminResetPasswordView.as_view(), name='admin_reset_user_password'),
    path('api/v1/', include(router.urls)),
]
