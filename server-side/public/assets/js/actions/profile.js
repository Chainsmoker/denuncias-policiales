import ApiClient from './client.js';
import { endpoints } from './variables.js'

class Profile extends ApiClient {
    constructor() {
        super();
        this.data = {
            user: {},
            recentIncidents: []
        }
        this.userForm = {
            email: '',
            first_name: '',
            last_name: '',
            phone: '',
            gender: '',
            region: '',
            distrito: '',
            address: '',
        };
        this.resetPasswordForm = {
            old_password: '',
            new_password: '',
            confirm_password: ''
        };
        this.avatarFile = null;
        this.avatarPreview = null;
        this.removeAvatarFlag = false;
        this.updating = false;
    }

    async init() {
        await this.getProfile();
    }

    ensureErrorObject() {
        if (typeof this.error !== 'object' || this.error === null || Array.isArray(this.error)) {
            this.error = {};
        }
    }

    async getProfile() {
        try {
            const { success, data } = await this.get(endpoints.profile);
            console.log( data.user);
            if (success) {
                this.data.user = data.user;
                this.data.recentIncidents = data.recent_incidents;
                
                this.userForm = {
                    email: data.user.email || '',
                    first_name: data.user.first_name || '',
                    last_name: data.user.last_name || '',
                    phone: data.user.phone || '',
                    gender: data.user.gender || '',
                    region: data.user.region || '',
                    distrito: data.user.distrito || '',
                    address: data.user.address || '',
                };
                
                this.error = {};
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            this.error = {};
        }
    }

    handleAvatarSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.ensureErrorObject();

        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            this.error.avatar = 'El archivo debe ser una imagen (JPG, PNG, GIF, WEBP)';
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.error.avatar = 'La imagen no debe superar los 5MB';
            event.target.value = '';
            return;
        }

        this.error.avatar = '';
        this.avatarFile = file;
        this.removeAvatarFlag = false;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.avatarPreview = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    removeAvatar() {
        this.avatarFile = null;
        this.avatarPreview = null;
        this.removeAvatarFlag = true;
        this.ensureErrorObject();
        this.error.avatar = '';
    }

    async updateProfile() {
        this.error = {};
        this.updating = true;

        try {
            const formData = new FormData();
            Object.keys(this.userForm).forEach(key => {
                if (this.userForm[key]) {
                    formData.append(key, this.userForm[key]);
                }
            });

            if (this.avatarFile) {
                formData.append('avatar', this.avatarFile);
            }

            if (this.removeAvatarFlag && !this.avatarFile) {
                formData.append('remove_avatar', 'true');
            }

            const token = localStorage.getItem('authToken');
            const response = await fetch(endpoints.updateProfile, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.avatarFile = null;
                this.avatarPreview = null;
                this.removeAvatarFlag = false;
                await this.getProfile();
                
                if (data.user && Alpine.store('currentUser')) {
                    Alpine.store('currentUser').update(data.user);
                }
            
                //window.location.href = '/dashboard/profile';
                this.success = 'Perfil actualizado correctamente!';
            } else {
                this.error = data;
                alert('Error al actualizar el perfil: ' + (data.detail || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.error = { non_field_errors: ['Error al actualizar el perfil.'] };
        } finally {
            this.updating = false;
        }
    }

    async getUserAddress() {
        if (this.data.user.region && this.data.user.distrito) {
            return `${this.data.user.region}, ${this.data.user.distrito}`;
        } else if (this.data.user.region) {
            return this.data.user.region;
        } else if (this.data.user.distrito) {
            return this.data.user.distrito;
        } else {
            return 'Dirección no disponible';
        }
    }

    getStatusBadgeClass(status) {
        const classes = {
            'Pending': 'text-warning bg-warning',
            'In Progress': 'text-primary bg-primary',
            'Resolved': 'text-success bg-success'
        };
        return classes[status] || 'text-secondary bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'Pending': 'Pendiente',
            'In Progress': 'En Progreso',
            'Resolved': 'Resuelto'
        };
        return texts[status] || status;
    }

    getTypeText(type) {
        const types = {
            'accident': 'Accidente de tránsito',
            'theft': 'Robo o hurto',
            'assault': 'Agresión o violencia física',
            'domestic_violence': 'Violencia familiar o de pareja',
            'fraud': 'Estafa o fraude',
            'missing_person': 'Persona desaparecida',
            'vandalism': 'Vandalismo o daños a la propiedad',
            'drug_trafficking': 'Tráfico o consumo de drogas',
            'homicide': 'Homicidio o intento de homicidio',
            'harassment': 'Acoso o amenazas',
            'cybercrime': 'Delito informático',
            'sexual_abuse': 'Abuso o acoso sexual',
            'weapon_possession': 'Tenencia ilegal de armas',
            'public_disturbance': 'Alteración del orden público',
            'child_abuse': 'Maltrato infantil',
            'animal_abuse': 'Maltrato animal',
            'property_dispute': 'Conflicto por propiedad',
            'corruption': 'Corrupción o soborno',
            'kidnapping': 'Secuestro o tentativa',
            'other': 'Otro tipo de denuncia'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('profile', () => new Profile());
});