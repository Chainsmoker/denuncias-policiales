from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from core.pagination import CustomPageNumberPagination
from .models import User
from .serializers import (
    UserSerializer, 
    UserUpdateSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)
from .permissions import IsSuperUser

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = CustomPageNumberPagination
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(region=region)
        
        is_staff = self.request.query_params.get('is_staff', None)
        if is_staff is not None:
            queryset = queryset.filter(is_staff=is_staff.lower() == 'true')
            
        search  = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(dni__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]
    lookup_field = 'pk'


class UserUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]
    lookup_field = 'pk'
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Usuario actualizado exitosamente',
            'user': serializer.data
        })
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]
    lookup_field = 'pk'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance.id == request.user.id:
            return Response({
                'error': 'No puedes eliminar tu propia cuenta.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if instance.is_superuser:
            superuser_count = User.objects.filter(is_superuser=True).count()
            if superuser_count <= 1:
                return Response({
                    'error': 'No se puede eliminar el último superusuario del sistema.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        dni = instance.dni
        self.perform_destroy(instance)
        
        return Response({
            'message': f'Usuario con DNI {dni} eliminado exitosamente.'
        }, status=status.HTTP_200_OK)

class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from denuncias_service.models import Denuncia
        from denuncias_service.serializers import DenunciaListSerializer
        
        user = request.user

        user_serializer = UserProfileSerializer(user, context={'request': request})

        recent_denuncias = Denuncia.objects.filter(user=user).order_by('-created_at')[:5]
        denuncias_serializer = DenunciaListSerializer(recent_denuncias, many=True)
        
        return Response({
            'user': user_serializer.data,
            'recent_incidents': denuncias_serializer.data,
        })

class UpdateMyProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        if request.data.get('remove_avatar') == 'true':
            if instance.avatar and instance.avatar.name != 'defaults/users/default.jpg':
                instance.avatar.delete(save=False)
                instance.avatar = 'defaults/users/default.jpg'
                instance.save()
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Perfil actualizado exitosamente',
            'user': serializer.data
        })
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


