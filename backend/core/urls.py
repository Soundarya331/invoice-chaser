from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.clients.views import ClientViewSet
from apps.invoices.views import InvoiceViewSet
from apps.reminders.views import ReminderViewSet

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
]
