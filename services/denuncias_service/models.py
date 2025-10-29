from django.db import models
from django.core.validators import RegexValidator, MinLengthValidator, MaxLengthValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from core.regions import REGION_CHOICES

STATUS_CHOICES = [
    ('Pending', 'Pending'),
    ('In Progress', 'In Progress'),
    ('Resolved', 'Resolved'),
]

TYPE_CHOICES = [
    ('accident', 'Accidente de tránsito'),
    ('theft', 'Robo o hurto'),
    ('assault', 'Agresión o violencia física'),
    ('domestic_violence', 'Violencia familiar o de pareja'),
    ('fraud', 'Estafa o fraude'),
    ('missing_person', 'Persona desaparecida'),
    ('vandalism', 'Vandalismo o daños a la propiedad'),
    ('drug_trafficking', 'Tráfico o consumo de drogas'),
    ('homicide', 'Homicidio o intento de homicidio'),
    ('harassment', 'Acoso o amenazas'),
    ('cybercrime', 'Delito informático'),
    ('sexual_abuse', 'Abuso o acoso sexual'),
    ('weapon_possession', 'Tenencia ilegal de armas'),
    ('public_disturbance', 'Alteración del orden público'),
    ('child_abuse', 'Maltrato infantil'),
    ('animal_abuse', 'Maltrato animal'),
    ('property_dispute', 'Conflicto por propiedad'),
    ('corruption', 'Corrupción o soborno'),
    ('kidnapping', 'Secuestro o tentativa'),
    ('other', 'Otro tipo de denuncia'),
]

description_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s,.;:()\-¿?¡!""\']+$',
    message='La descripción contiene caracteres no permitidos.'
)

district_validator = RegexValidator(
    regex=r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-]+$',
    message='El distrito solo puede contener letras, espacios y guiones.'
)

def validate_latitude(value):
    if value is not None and (value < -18.5 or value > 0):
        raise ValidationError('La latitud debe estar entre -18.5 y 0 (rango válido para Perú).')

def validate_longitude(value):
    if value is not None and (value < -81.5 or value > -68.5):
        raise ValidationError('La longitud debe estar entre -81.5 y -68.5 (rango válido para Perú).')

def validate_file_size(value):
    filesize = value.size
    if filesize > 50 * 1024 * 1024:
        raise ValidationError('El tamaño del archivo no puede superar los 50MB.')

def validate_file_extension(value):
    import os
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
    if ext not in valid_extensions:
        raise ValidationError(f'Extensión de archivo no permitida. Use: {", ".join(valid_extensions)}')

class Denuncia(models.Model):
    user = models.ForeignKey('users_service.User', on_delete=models.CASCADE)
    description = models.TextField(
        validators=[
            description_validator, 
            MinLengthValidator(20, message='La descripción debe tener al menos 20 caracteres.'),
            MaxLengthValidator(2000, message='La descripción no puede superar los 2000 caracteres.')
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    district = models.CharField(
        max_length=100,
        validators=[
            district_validator,
            MinLengthValidator(2, message='El distrito debe tener al menos 2 caracteres.'),
            MaxLengthValidator(100)
        ]
    )
    region = models.CharField(
        max_length=100, 
        choices=REGION_CHOICES
    )
    lat = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        null=True, 
        blank=True,
        validators=[validate_latitude]
    )
    _type = models.CharField(
        max_length=50, 
        choices=TYPE_CHOICES
    )
    lon = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        null=True, 
        blank=True,
        validators=[validate_longitude]
    )
    status = models.CharField(
        max_length=50, 
        default='Pending', 
        choices=STATUS_CHOICES
    )

    def __str__(self):
        return self.description[:50]
    
    def clean(self):
        super().clean()
        
        if (self.lat is not None and self.lon is None) or (self.lon is not None and self.lat is None):
            raise ValidationError('Debe proporcionar tanto la latitud como la longitud, o ninguna de las dos.')
        
        words = self.description.split()
        for word in words:
            if len(word) > 50:
                raise ValidationError('La descripción contiene palabras demasiado largas. Verifique el texto.')
    
    class Meta:
        verbose_name = 'Denuncia'
        verbose_name_plural = 'Denuncias'
        ordering = ['-created_at']


class DenunciaEvidencia(models.Model):
    incident = models.ForeignKey(Denuncia, on_delete=models.CASCADE, related_name='evidence')
    file = models.FileField(
        upload_to='denuncias/evidencias/%Y/%m/%d/',
        validators=[validate_file_size, validate_file_extension]
    )
    file_type = models.CharField(
        max_length=10, 
        choices=[('image', 'Image'), ('video', 'Video')]
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_type} - {self.incident.id}"
    
    def clean(self):
        super().clean()
        
        if self.file:
            import os
            ext = os.path.splitext(self.file.name)[1].lower()
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            video_extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
            
            if self.file_type == 'image' and ext not in image_extensions:
                raise ValidationError(f'El archivo no es una imagen válida. Use: {", ".join(image_extensions)}')
            elif self.file_type == 'video' and ext not in video_extensions:
                raise ValidationError(f'El archivo no es un video válido. Use: {", ".join(video_extensions)}')

    class Meta:
        verbose_name = 'Evidence'
        verbose_name_plural = 'Evidence'
        ordering = ['-uploaded_at']