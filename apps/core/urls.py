from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopicViewSet, DailyLessonViewSet

router = DefaultRouter()
router.register(r'topics', TopicViewSet)
router.register(r'lessons', DailyLessonViewSet, basename='dailylesson')

urlpatterns = [
    path('', include(router.urls)),
]
