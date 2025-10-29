import ApiClient from './client.js';
import { endpoints } from './variables.js';

class Incidents extends ApiClient {
    constructor() {
        super();
        this.data = {
            count: 0,
            current_page: 1,
            next: null,
            previous: null,
            results: [],
            total_pages: 1,
            page_size: 10,
        };
        this.searchQuery = '';
        this.incidentToDelete = null;
        this.deleting = false;
        this.editingIncident = null;
        this.saving = false;
        this.gettingLocation = false;
        this.incidentForm = {
            description: '',
            district: '',
            region: '',
            _type: '',
            lat: null,
            lon: null,
            status: 'Pending'
        };
        this.evidenceFiles = [];
        this.evidenceToDelete = null;
        this.deletingEvidence = false;
        this.uploadingEvidence = false;
        this.showFullscreenViewer = false;
        this.currentEvidenceIndex = 0;
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('userData');
        return userStr ? JSON.parse(userStr) : null;
    }

    get isRegularUser() {
        return this.currentUser && !this.currentUser.is_staff && !this.currentUser.is_superuser;
    }

    async init() {
        await this.getIncidents(this.data.current_page);
    }

    async getIncidents(page = 1, search = '') {
        try {
            let url = `${endpoints.incidents}?page=${page}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const { success, data } = await this.get(url);

            if (success) {
                this.data = data;
                this.data.current_page = page;
            }
        } catch (error) {
            console.error('Error al obtener denuncias:', error);
        }
    }

    async getIncidentById(id) {
        try {
            const url = `${endpoints.incidents}${id}/`;
            const { success, data } = await this.get(url);
            
            if (success) {
                return data;
            }
            return null;
        } catch (error) {
            console.error('Error al obtener denuncia:', error);
            return null;
        }
    }

    async goToPage(page) {
        if (page < 1 || page > this.data.total_pages || page === this.data.current_page) return;
        await this.getIncidents(page, this.searchQuery);
    }

    async handleSearch() {
        this.data.current_page = 1;
        await this.getIncidents(1, this.searchQuery);
    }

    async clearSearch() {
        this.searchQuery = '';
        this.data.current_page = 1;
        await this.getIncidents(1, '');
    }

    getLocation() {
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización');
            return;
        }

        this.gettingLocation = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.incidentForm.lat = position.coords.latitude;
                this.incidentForm.lon = position.coords.longitude;
                this.gettingLocation = false;
            },
            (error) => {
                this.gettingLocation = false;
                let errorMessage = 'Error al obtener la ubicación';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso denegado. Por favor, permite el acceso a tu ubicación.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Información de ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado al obtener la ubicación.';
                        break;
                }
                
                this.error.non_field_errors = errorMessage;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    async openIncidentModal(incident = null) {
        this.editingIncident = incident;
        this.error = {};
        this.evidenceFiles = [];
        
        if (incident) {
            const reloadedIncident = await this.getIncidentById(incident.id);
            if (reloadedIncident) {
                this.editingIncident = reloadedIncident;
                incident = reloadedIncident;
            }
            
            this.incidentForm = {
                description: incident.description || '',
                district: incident.district || '',
                region: incident.region || '',
                _type: incident._type || '',
                lat: incident.lat || null,
                lon: incident.lon || null,
                status: incident.status || 'Pending'
            };
            this.evidenceFiles = incident.evidence ? [...incident.evidence] : [];
        } else {
            this.incidentForm = {
                description: '',
                district: '',
                region: '',
                _type: '',
                lat: null,
                lon: null,
                status: 'Pending'
            };
        }

        const modal = new bootstrap.Modal(document.getElementById('incidentModal'));
        modal.show();
    }

    async saveIncident() {
        this.error = {};
        this.saving = true;

        try {
            let url, method, body;

            if (this.editingIncident) {
                url = `${endpoints.incidents}${this.editingIncident.id}/update/`;
                method = 'PATCH';
                body = {
                    description: this.incidentForm.description,
                    district: this.incidentForm.district,
                    region: this.incidentForm.region,
                    _type: this.incidentForm._type,
                    lat: this.incidentForm.lat,
                    lon: this.incidentForm.lon,
                    status: this.incidentForm.status
                };
            } else {
                url = endpoints.createIncident;
                method = 'POST';
                body = {
                    description: this.incidentForm.description,
                    district: this.incidentForm.district,
                    region: this.incidentForm.region,
                    _type: this.incidentForm._type,
                    lat: this.incidentForm.lat,
                    lon: this.incidentForm.lon
                };
            }

            if (method === 'POST') {
                const { success, errors, data: responseData } = await this.post(url, body);
                if (success) {
                    if (responseData && responseData.id) {
                        await this.uploadEvidence(responseData.id);
                    }
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('incidentModal'));
                    modal.hide();
                    await this.getIncidents(1, this.searchQuery);
                } else {
                    this.error = errors;
                }
            } else if (method === 'PATCH') {
                const { success, errors } = await this.patch(url, body);
                if (success) {
                    await this.uploadEvidence(this.editingIncident.id);
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('incidentModal'));
                    modal.hide();
                    await this.getIncidents(this.data.current_page, this.searchQuery);
                } else {
                    this.error = errors;
                }
            }

        } catch (error) {
            console.error('Error al guardar denuncia:', error);
            this.error.non_field_errors = ['Error al guardar la denuncia, por favor intente nuevamente.'];
        } finally {
            this.saving = false;
        }
    }

    openDeleteModal(incident) {
        this.incidentToDelete = incident;
        this.error = {};
        const modal = new bootstrap.Modal(document.getElementById('deleteIncidentModal'));
        modal.show();
    }

    async confirmDelete() {
        if (!this.incidentToDelete) return;

        this.deleting = true;
        try {
            const url = `${endpoints.incidents}${this.incidentToDelete.id}/delete/`;
            const { success, message } = await this.delete(url);

            if (success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteIncidentModal'));
                modal.hide();
                await this.getIncidents(this.data.current_page, this.searchQuery);
            } else {
                alert('Error al eliminar la denuncia: ' + (message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al eliminar denuncia:', error);
            this.error = { non_field_errors: ['Error al eliminar la denuncia, por favor intente nuevamente.'] };
        } finally {
            this.deleting = false;
            this.incidentToDelete = null;
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

    get visiblePages() {
        const total = this.data.total_pages;
        const current = this.data.current_page;
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        if (total <= 7) {
            for (let i = 1; i <= total; i++) {
                range.push(i);
            }
            return range;
        }

        for (let i = 1; i <= total; i++) {
            if (
                i === 1 || 
                i === total ||
                (i >= current - delta && i <= current + delta) 
            ) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/x-flv', 'video/webm'];
            
            if (!validImageTypes.includes(file.type) && !validVideoTypes.includes(file.type)) {
                alert(`El archivo ${file.name} no es una imagen o video válido`);
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                alert(`El archivo ${file.name} es demasiado grande (máximo 50MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    file: file,
                    name: file.name,
                    file_type: validImageTypes.includes(file.type) ? 'image' : 'video',
                    file_url: e.target.result,
                    isNew: true
                };
                this.evidenceFiles.push(fileData);
            };
            reader.readAsDataURL(file);
        });

        event.target.value = '';
    }

    removeEvidence(index) {
        const evidence = this.evidenceFiles[index];
        
        if (evidence.id) {
            this.evidenceToDelete = evidence;
            const modal = new bootstrap.Modal(document.getElementById('deleteEvidenceModal'));
            modal.show();
        } else {
            this.evidenceFiles.splice(index, 1);
        }
    }

    async confirmDeleteEvidence() {
        if (!this.evidenceToDelete) return;

        this.deletingEvidence = true;
        try {
            const url = `${endpoints.incidents}evidence/${this.evidenceToDelete.id}/delete/`;
            const { success, errors } = await this.delete(url);

            if (success) {
                const index = this.evidenceFiles.findIndex(e => e.id === this.evidenceToDelete.id);
                if (index !== -1) {
                    this.evidenceFiles.splice(index, 1);
                }
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteEvidenceModal'));
                modal.hide();
            } else {
                this.error.non_field_errors = errors;
            }
        } catch (error) {
            console.error('Error al eliminar evidencia:', error);
            alert('Error al eliminar evidencia');
        } finally {
            this.deletingEvidence = false;
            this.evidenceToDelete = null;
        }
    }

    async uploadEvidence(incidentId) {
        const newFiles = this.evidenceFiles.filter(e => e.isNew);
        
        if (newFiles.length === 0) return;

        this.uploadingEvidence = true;

        for (const fileData of newFiles) {
            try {
                const formData = new FormData();
                formData.append('file', fileData.file);

                const url = `${endpoints.incidents}${incidentId}/evidences/upload/`;
                const token = localStorage.getItem('authToken');
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    console.log('Evidencia subida:', data);
                } else {
                    this.error.non_field_errors = data.error || 'Error al subir evidencia';
                }
            } catch (error) {
                console.error('Error al subir evidencia:', error);
            }
        }

        this.uploadingEvidence = false;
        
        const updatedIncident = await this.getIncidentById(incidentId);
        if (updatedIncident) {
            this.editingIncident = updatedIncident;
            this.evidenceFiles = updatedIncident.evidence ? [...updatedIncident.evidence] : [];
        }
    }

    async uploadEvidenceOnly() {
        if (!this.editingIncident) return;
        
        await this.uploadEvidence(this.editingIncident.id);
    }

    get hasNewEvidence() {
        return this.evidenceFiles.some(e => e.isNew);
    }

    isImage(evidence) {
        return evidence.file_type === 'image';
    }

    isVideo(evidence) {
        return evidence.file_type === 'video';
    }

    // Fullscreen Evidence Viewer Methods
    showEvidenceFullscreen(index) {
        this.currentEvidenceIndex = index;
        this.showFullscreenViewer = true;
        document.body.style.overflow = 'hidden';
    }

    closeEvidenceFullscreen() {
        this.showFullscreenViewer = false;
        this.currentEvidenceIndex = 0;
        document.body.style.overflow = 'auto';
    }

    nextEvidence() {
        if (this.currentEvidenceIndex < this.evidenceFiles.length - 1) {
            this.currentEvidenceIndex++;
        }
    }

    prevEvidence() {
        if (this.currentEvidenceIndex > 0) {
            this.currentEvidenceIndex--;
        }
    }

    get currentEvidence() {
        return this.evidenceFiles[this.currentEvidenceIndex] || null;
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('incidents', () => new Incidents());
});
