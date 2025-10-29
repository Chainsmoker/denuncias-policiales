from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.core.validators import RegexValidator, MinLengthValidator, MaxLengthValidator, EmailValidator
from django.core.exceptions import ValidationError
from core.regions import REGION_CHOICES
import re

GENDER_CHOICES = [
    ('male', 'Masculino'),
    ('female', 'Femenino'),
]

dni_validator = RegexValidator(
    regex=r'^\d{8}$',
    message='El DNI debe contener exactamente 8 dígitos numéricos.'
)

phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message='El teléfono debe contener entre 9 y 15 dígitos. Puede incluir + al inicio.'
)

name_validator = RegexValidator(
    regex=r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$',
    message='El nombre solo puede contener letras y espacios.'
)

address_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s,.\-#°]+$',
    message='La dirección contiene caracteres no permitidos.'
)

distrito_validator = RegexValidator(
    regex=r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-]+$',
    message='El distrito solo puede contener letras, espacios y guiones.'
)

class UserManager(BaseUserManager):
    def get_by_natural_key(self, email):
        return self.get(**{self.model.USERNAME_FIELD: email})
    
    def create_user(self, email, dni=None, first_name='', last_name='', password=None, **extra_fields):
        if not email:
            raise ValueError('El correo electrónico es obligatorio')
        
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            dni=dni,
            first_name=first_name,
            last_name=last_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, dni, first_name, last_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')
        
        return self.create_user(email, dni, first_name, last_name, password, **extra_fields)

class User(AbstractBaseUser):
    dni = models.CharField(
        max_length=8, 
        null=False, 
        blank=False, 
        unique=True, 
        validators=[dni_validator, MinLengthValidator(8), MaxLengthValidator(8)]
    )
    first_name = models.CharField(
        max_length=30,
        validators=[name_validator, MinLengthValidator(2), MaxLengthValidator(30)]
    )
    last_name = models.CharField(
        max_length=30,
        validators=[name_validator, MinLengthValidator(2), MaxLengthValidator(30)]
    )
    phone = models.CharField(
        max_length=15, 
        blank=True, 
        null=True,
        validators=[phone_validator]
    )
    region = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        choices=REGION_CHOICES
    )
    distrito = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        validators=[distrito_validator]
    )
    address = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        validators=[address_validator, MaxLengthValidator(100)]
    )
    gender = models.CharField(
        max_length=10, 
        blank=True, 
        null=True, 
        choices=GENDER_CHOICES
    )
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator(message='Ingrese un correo electrónico válido.')]
    )
    avatar = models.ImageField(
        upload_to='avatars/', 
        blank=True, 
        null=True, 
        default='defaults/users/default.jpg'
    )
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['dni', 'first_name', 'last_name']

    def __str__(self):
        return self.email
    
    def clean(self):
        super().clean()
        
        if self.email:
            if '..' in self.email or self.email.startswith('.') or self.email.endswith('.'):
                raise ValidationError({'email': 'El correo electrónico contiene un formato inválido.'})
        
        if self.dni and not self.dni.isdigit():
            raise ValidationError({'dni': 'El DNI debe contener solo dígitos.'})
        
        if self.first_name and re.search(r'\d', self.first_name):
            raise ValidationError({'first_name': 'El nombre no debe contener números.'})
        
        if self.last_name and re.search(r'\d', self.last_name):
            raise ValidationError({'last_name': 'El apellido no debe contener números.'})
        
        if self.phone and re.search(r'[a-zA-Z]', self.phone):
            raise ValidationError({'phone': 'El teléfono no debe contener letras.'})
        
        if self.address and len(self.address.strip()) < 5:
            raise ValidationError({'address': 'La dirección debe tener al menos 5 caracteres.'})
    
    def has_perm(self, perm, obj=None):
        return self.is_superuser
    
    def has_module_perms(self, app_label):
        return self.is_superuser
    
    @property
    def full_name(self):
        return f"{self.first_name.title()} {self.last_name.title()}".strip()
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-date_joined']

