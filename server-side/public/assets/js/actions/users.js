import ApiClient from './client.js';
import { endpoints } from './variables.js';

class Users extends ApiClient {
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
        this.userToDelete = null;
        this.deleting = false;
        this.editingUser = null;
        this.saving = false;
        this.userForm = {
            dni: '',
            email: '',
            first_name: '',
            last_name: '',
            phone: '',
            gender: '',
            region: '',
            distrito: '',
            address: '',
            password: '',
            password2: '',
            is_active: 'true',
            is_superuser: 'false'
        };
    }

    async init() {
        await this.getUsers(this.data.current_page);
    }

    async getUsers(page = 1, search = '') {
        try {
            let url = `${endpoints.users}?page=${page}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const { success, data } = await this.get(url);

            if (success) {
                console.log( data);
                this.data = data;
                this.data.current_page = page;
            }
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
        }
    }

    async goToPage(page) {
        if (page < 1 || page > this.data.total_pages || page === this.data.current_page) return;
        await this.getUsers(page, this.searchQuery);
    }

    async handleSearch() {
        this.data.current_page = 1;
        await this.getUsers(1, this.searchQuery);
    }

    async clearSearch() {
        this.searchQuery = '';
        this.data.current_page = 1;
        await this.getUsers(1, '');
    }

    openUserModal(user = null) {
        this.editingUser = user;
        this.error = {}; 
        
        if (user) {
            this.userForm = {
                dni: user.dni || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone: user.phone || '',
                gender: user.gender || '',
                region: user.region || '',
                distrito: user.distrito || '',
                address: user.address || '',
                password: '',
                password2: '',
                is_active: user.is_active ? 'true' : 'false',
                is_superuser: user.is_superuser ? 'true' : 'false'
            };
        } else {
            this.userForm = {
                dni: '',
                email: '',
                first_name: '',
                last_name: '',
                phone: '',
                gender: '',
                region: '',
                distrito: '',
                address: '',
                password: '',
                password2: '',
                is_active: 'true',
                is_superuser: 'false'
            };
        }

        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }

    async saveUser() {
        /*
        if (!this.editingUser) {
            if (this.userForm.password !== this.userForm.password2) {
                alert('Las contraseñas no coinciden');
                return;
            }
            if (this.userForm.password.length < 8) {
                alert('La contraseña debe tener al menos 8 caracteres');
                return;
            }
        }
        */

        this.saving = true;
        try {
            let url, method, body;

            if (this.editingUser) {
                url = `${endpoints.users}${this.editingUser.id}/update/`;
                method = 'PATCH';
                body = {
                    first_name: this.userForm.first_name,
                    last_name: this.userForm.last_name,
                    phone: this.userForm.phone,
                    email: this.userForm.email,
                    gender: this.userForm.gender,
                    region: this.userForm.region,
                    distrito: this.userForm.distrito,
                    address: this.userForm.address,
                    is_active: this.userForm.is_active === 'true',
                    is_superuser: this.userForm.is_superuser === 'true'
                };
            } else {
                url = endpoints.register;
                method = 'POST';
                body = {
                    dni: this.userForm.dni,
                    email: this.userForm.email,
                    password: this.userForm.password,
                    password_confirm: this.userForm.password2
                };
            }

            if (method === 'POST') {
                const { success, errors } = await this.post(url, body);
                if (success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                    modal.hide();
                    await this.getUsers(1, this.searchQuery);
                } else {
                    this.error = errors;
                }
            } else if (method === 'PATCH') {
                const { success, errors } = await this.patch(url, body);
                if (success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                    modal.hide();
                    await this.getUsers(this.data.current_page, this.searchQuery);
                } else {
                    this.error = errors;
                }
            }

        } catch (error) {
            console.error('Error al guardar usuario:', error);
            this.error = { non_field_errors: ['Error al guardar el usuario, por favor intente nuevamente.'] };
        } finally {
            this.saving = false;
        }
    }

    openDeleteModal(user) {
        this.userToDelete = user;
        this.error = null;
        const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
        modal.show();
    }

    async confirmDelete() {
        if (!this.userToDelete) return;

        this.deleting = true;
        try {
            const url = `${endpoints.users}${this.userToDelete.id}/delete/`;
            const { success, message } = await this.delete(url);

            if (success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
                modal.hide();
                await this.getUsers(this.data.current_page, this.searchQuery);
            } else {
                alert('Error al eliminar el usuario: ' + (message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            this.error = { non_field_errors: ['Error al eliminar el usuario, por favor intente nuevamente.'] };
        } finally {
            this.deleting = false;
            this.userToDelete = null;
        }
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
}

document.addEventListener('alpine:init', () => {
    Alpine.data('users', () => new Users());
});
