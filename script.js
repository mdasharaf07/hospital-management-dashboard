document.addEventListener('DOMContentLoaded', function () {
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true,
    });

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.content-section');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenu = document.getElementById('userMenu');

    let patientAdmissionsChartInstance, departmentPopularityChartInstance;
    let isCalendarRendered = false; // Flag for FullCalendar
    let calendarInstance = null; // To store FullCalendar instance

    // --- Sidebar Toggle ---
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-collapsed');
        sidebar.classList.toggle('sidebar-expanded');
        if (sidebar.classList.contains('sidebar-collapsed')) {
            mainContent.classList.remove('ml-64');
            mainContent.classList.add('ml-[4.5rem]');
        } else {
            mainContent.classList.remove('ml-[4.5rem]');
            mainContent.classList.add('ml-64');
        }
        // Re-evaluate calendar size after sidebar toggle
        if (isCalendarRendered && calendarInstance) {
            setTimeout(() => { // Delay to allow sidebar transition to complete
                calendarInstance.updateSize();
            }, 350); // Adjust delay to match sidebar transition time
        }
    });

    if (window.innerWidth < 768) {
        sidebar.classList.add('sidebar-collapsed');
        sidebar.classList.remove('sidebar-expanded');
        mainContent.classList.remove('ml-64');
        mainContent.classList.add('ml-[4.5rem]');
    }

    // --- Dark Mode Toggle ---
    const applyDarkMode = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            darkModeIcon.setAttribute('name', 'sunny-outline');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.documentElement.classList.remove('dark');
            darkModeIcon.setAttribute('name', 'moon-outline');
            localStorage.setItem('darkMode', 'disabled');
        }
        if (typeof patientAdmissionsChartInstance !== 'undefined' && patientAdmissionsChartInstance) {
            patientAdmissionsChartInstance.destroy();
            initPatientAdmissionsChart();
        }
        if (typeof departmentPopularityChartInstance !== 'undefined' && departmentPopularityChartInstance) {
            departmentPopularityChartInstance.destroy();
            initDepartmentPopularityChart();
        }
        // For FullCalendar, its appearance in dark mode is primarily handled by
        // Tailwind's dark: variants on utility classes applied to its container
        // or via custom CSS that respects the .dark class on <html>.
        // If specific FullCalendar theme changes are needed, its JS API would be used.
        // Re-rendering calendar if it's already visible and theme changes
        if (isCalendarRendered && calendarInstance && document.getElementById('appointments').classList.contains('hidden') === false) {
            // Destroy and re-initialize to pick up new theme context for some elements
            // This is a heavier approach but ensures theme consistency if CSS alone isn't enough
            calendarInstance.destroy();
            isCalendarRendered = false; // Reset flag
            initFullCalendar();
        }
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        applyDarkMode(true);
    } else {
        applyDarkMode(false);
    }

    darkModeToggle.addEventListener('click', () => {
        const isDarkModeEnabled = document.documentElement.classList.contains('dark');
        applyDarkMode(!isDarkModeEnabled);
    });

    // --- User Menu Dropdown ---
    userMenuButton.addEventListener('click', () => {
        userMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (event) => {
        if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
            userMenu.classList.add('hidden');
        }
    });

    // --- Section Navigation & Styling Active Link ---
    function styleActiveSidebarLink() {
        sidebarLinks.forEach(s_link => {
            const icon = s_link.querySelector('ion-icon');
            if (s_link.classList.contains('active')) {
                s_link.classList.add('bg-blue-600', 'text-white');
                if (icon) {
                    icon.classList.remove('text-gray-500', 'dark:text-gray-400');
                    icon.classList.add('text-white');
                }
            } else {
                s_link.classList.remove('bg-blue-600', 'text-white');
                if (icon) {
                    icon.classList.remove('text-white');
                    icon.classList.add('text-gray-500', 'dark:text-gray-400');
                }
            }
        });
    }

    function showSection(sectionId) {
        contentSections.forEach(section => {
            if (section.id === sectionId) {
                section.classList.remove('hidden');
                AOS.refreshHard();
                if (sectionId === 'appointments' && !isCalendarRendered) {
                    initFullCalendar();
                } else if (sectionId === 'appointments' && calendarInstance) {
                    calendarInstance.updateSize();
                }
            } else {
                section.classList.add('hidden');
            }
        });
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;

            sidebarLinks.forEach(s_link => {
                s_link.classList.remove('active');
            });
            link.classList.add('active');

            styleActiveSidebarLink();
            showSection(sectionId);

            if (window.innerWidth < 768 && !sidebar.classList.contains('sidebar-collapsed')) {
                sidebarToggle.click();
            }
        });
    });

    styleActiveSidebarLink();
    showSection('dashboard');

    // --- Chart.js ---
    function getChartColors() {
        const isDark = document.documentElement.classList.contains('dark');
        return {
            textColor: isDark ? '#E5E7EB' : '#374151',
            gridColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            tertiaryColor: '#F59E0B',
        };
    }

    function initPatientAdmissionsChart() {
        const canvas = document.getElementById('patientAdmissionsChart');
        if (!canvas) return;
        const ctx1 = canvas.getContext('2d');
        const colors = getChartColors();
        patientAdmissionsChartInstance = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Admissions',
                    data: [65, 59, 80, 81, 56, 55, 90],
                    fill: true,
                    borderColor: colors.primaryColor,
                    tension: 0.3,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: colors.textColor }, grid: { color: colors.gridColor, borderColor: colors.gridColor } },
                    x: { ticks: { color: colors.textColor }, grid: { color: colors.gridColor, borderColor: colors.gridColor } }
                },
                plugins: { legend: { labels: { color: colors.textColor } } }
            }
        });
    }

    function initDepartmentPopularityChart() {
        const canvas = document.getElementById('departmentPopularityChart');
        if (!canvas) return;
        const ctx2 = canvas.getContext('2d');
        const colors = getChartColors();
        departmentPopularityChartInstance = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Cardiology', 'Neurology', 'Pediatrics', 'Oncology', 'Orthopedics'],
                datasets: [{
                    label: 'Patient Visits',
                    data: [300, 150, 220, 180, 250],
                    backgroundColor: [colors.primaryColor, colors.secondaryColor, colors.tertiaryColor, '#6366F1', '#EC4899'],
                    hoverOffset: 4,
                    borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff', // Match bg for better look
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: colors.textColor } } }
            }
        });
    }

    initPatientAdmissionsChart();
    initDepartmentPopularityChart();

    // --- FullCalendar ---
    function initFullCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (calendarEl && !isCalendarRendered) {
            calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                },
                events: [
                    { title: 'Meeting with Dr. Smith', start: '2025-05-20T10:30:00', end: '2025-05-20T11:30:00', backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                    { title: 'Surgery - Patient X', start: '2025-05-22T09:00:00', end: '2025-05-22T13:00:00', backgroundColor: '#EF4444', borderColor: '#EF4444' },
                    { title: 'Conference Call', start: '2025-05-25', backgroundColor: '#10B981', borderColor: '#10B981' }
                ],
                editable: true, selectable: true, dayMaxEvents: true,
                dateClick: function (info) {
                    Swal.fire({
                        title: 'Add New Appointment',
                        html: `<input id="swal-input-title" class="swal2-input" placeholder="Event Title" value="New Appointment"> <input id="swal-input-date" type="date" class="swal2-input" value="${info.dateStr}">`,
                        focusConfirm: false,
                        preConfirm: () => ({ title: document.getElementById('swal-input-title').value, date: document.getElementById('swal-input-date').value }),
                        showCancelButton: true, confirmButtonText: 'Add Event',
                        customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500', cancelButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400 ml-2' }, buttonsStyling: false
                    }).then((result) => {
                        if (result.isConfirmed && result.value.title && result.value.date) {
                            calendarInstance.addEvent({ title: result.value.title, start: result.value.date, allDay: true, backgroundColor: '#F59E0B', borderColor: '#F59E0B' });
                            Swal.fire({ title: 'Success!', text: 'Appointment added.', icon: 'success', customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' }, buttonsStyling: false });
                        }
                    });
                },
                eventClick: function (info) {
                    Swal.fire({
                        title: info.event.title,
                        html: `<p><strong>Starts:</strong> ${info.event.start ? info.event.start.toLocaleString() : 'N/A'}</p> <p><strong>Ends:</strong> ${info.event.end ? info.event.end.toLocaleString() : 'N/A'}</p>`,
                        icon: 'info', showCancelButton: true, confirmButtonText: 'Edit', denyButtonText: 'Delete', showDenyButton: true,
                        customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500', denyButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 ml-2', cancelButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400 ml-2' }, buttonsStyling: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            Swal.fire({ title: 'Edit Event', text: 'Edit functionality placeholder.', icon: 'info', customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' }, buttonsStyling: false });
                        } else if (result.isDenied) {
                            info.event.remove();
                            Swal.fire({ title: 'Deleted!', text: 'Appointment removed.', icon: 'success', customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' }, buttonsStyling: false });
                        }
                    });
                }
            });
            calendarInstance.render();
            isCalendarRendered = true;
        } else if (calendarInstance) {
            calendarInstance.updateSize();
        }
    }

    // --- DataTables ---
    const patientTable = $('#patientTable');
    if (patientTable.length) {
        patientTable.DataTable({
            responsive: true,
            data: [
                ["P001", "John Doe", "35", "Male", "2025-05-10", "Dr. Smith", ""], ["P002", "Jane Smith", "28", "Female", "2025-05-12", "Dr. Lee", ""],
                ["P003", "Robert Brown", "45", "Male", "2025-05-08", "Dr. Wilson", ""], ["P004", "Emily White", "62", "Female", "2025-05-11", "Dr. Smith", ""],
                ["P005", "Michael Green", "19", "Male", "2025-05-09", "Dr. Davis", ""], ["P006", "Olivia Black", "50", "Female", "2025-05-13", "Dr. Lee", ""],
            ],
            columns: [
                { title: "Patient ID" }, { title: "Name" }, { title: "Age" }, { title: "Gender" }, { title: "Last Visit" }, { title: "Assigned Doctor" },
                { title: "Actions", render: function () { return `<button class="inline-flex p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-500 hover:text-blue-600" title="View Details"><ion-icon name="eye-outline" class="text-lg"></ion-icon></button&gt <button class="inline-flex p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-green-500 hover:text-green-600" title="Edit"><ion-icon name="pencil-outline" class="text-lg"></ion-icon></button&gt <button class="inline-flex p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500 hover:text-red-600" title="Delete"><ion-icon name="trash-outline" class="text-lg"></ion-icon></button&gt`; }, orderable: false, className: "text-center" }
            ],
            language: { search: "_INPUT_", searchPlaceholder: "Search patients...", lengthMenu: "Show _MENU_ entries" },
            drawCallback: function () { AOS.refreshHard(); }
        });
    }

    // --- SweetAlert2 Examples ---
    const addPatientBtn = document.getElementById('addPatientBtn');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Add New Patient',
                html: `<input id="swal-input-name" class="swal2-input" placeholder="Full Name"> <input id="swal-input-age" type="number" class="swal2-input" placeholder="Age"> <select id="swal-input-gender" class="swal2-input"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>`,
                focusConfirm: false,
                preConfirm: () => ({ name: document.getElementById('swal-input-name').value, age: document.getElementById('swal-input-age').value, gender: document.getElementById('swal-input-gender').value }),
                showCancelButton: true, confirmButtonText: 'Add Patient',
                customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500', cancelButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400 ml-2' }, buttonsStyling: false
            }).then((result) => {
                if (result.isConfirmed && result.value.name) {
                    Swal.fire({ title: 'Success!', text: `${result.value.name} added successfully.`, icon: 'success', customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' }, buttonsStyling: false });
                }
            });
        });
    }

    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', () => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Create Invoice form would appear here.', showConfirmButton: false, timer: 3000, timerProgressBar: true, customClass: { popup: 'dark:bg-gray-700 dark:text-white' } });
        });
    }

    const uploadRecordBtn = document.getElementById('uploadRecordBtn');
    if (uploadRecordBtn) {
        uploadRecordBtn.addEventListener('click', async () => {
            const { value: file } = await Swal.fire({
                title: 'Select file to upload', input: 'file', inputAttributes: { 'accept': 'image/*,.pdf,.doc,.docx', 'aria-label': 'Upload your medical report' },
                customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500', cancelButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400 ml-2' }, buttonsStyling: false, showCancelButton: true, confirmButtonText: 'Upload'
            });
            if (file) { Swal.fire({ title: 'File Selected', text: `You selected: ${file.name}`, icon: 'success', customClass: { popup: 'dark:bg-gray-800 dark:text-white', confirmButton: 'px-4 py-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' }, buttonsStyling: false }) }
        });
    }

}); // End DOMContentLoaded