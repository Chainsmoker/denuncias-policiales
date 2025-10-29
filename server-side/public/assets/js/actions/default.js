document.addEventListener('alpine:init', () => {
    Alpine.store('currentUser', {
        avatar: '',
        full_name: '',
        is_superuser: false,
        email: '',
        dni: '',

        load() {
            const data = localStorage.getItem('userData');
            if (data) {
                try {
                    const user = JSON.parse(data);
                    this.set(user);
                } catch (error) {
                    console.error('Error al parsear userData:', error);
                }
            }
        },

        set(user) {
            this.avatar = user.avatar || '/assets/images/default-avatar.png';
            this.full_name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
            this.is_superuser = user.is_superuser || false;
            this.email = user.email || '';
            this.dni = user.dni || '';
        },

        update(userData) {
            localStorage.setItem('userData', JSON.stringify(userData));
            this.set(userData);
        },
    });

    Alpine.store('currentUser').load();
});
