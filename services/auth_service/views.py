import requests
from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
)

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            user_data = UserSerializer(user).data

            requests.post(
                "http://notification_service:3001/send-email",
                json={"email": user.email, "subject": "Bienvenido a Roadify!", "message": f"Hola {user.first_name}, gracias por registrarte en Roadify."},
            )

            return Response(
                {
                    "message": "Registro exitoso",
                    "user": user_data,
                    "token": token.key,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response(
                {"error": "Credenciales inválidas"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user, context={'request': request}).data

        return Response(
            {
                "message": "Inicio de sesión exitoso",
                "user": user_data,
                "token": token.key,
            },
            status=status.HTTP_200_OK,
        )

class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass

        return Response(
            {"message": "Sesión cerrada exitosamente"},
            status=status.HTTP_200_OK,
        )
