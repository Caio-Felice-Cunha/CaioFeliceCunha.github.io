document.addEventListener('DOMContentLoaded', function() {
    // Navigation background change on scroll
    const nav = document.querySelector('nav');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Load projects from GitHub API
    fetchGitHubProjects();

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const subtabs = document.querySelectorAll('.subtab');
    const dataSubcategories = document.querySelector('.data-subcategories');
    const backendSubcategories = document.querySelector('.backend-subcategories');

    // Initialize subcategories visibility
    dataSubcategories.style.display = 'flex';
    backendSubcategories.style.display = 'none';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide appropriate subcategories
            const dataSubcategories = document.querySelector('.data-subcategories');
            const backendSubcategories = document.querySelector('.backend-subcategories');
            
            if (tab.dataset.category === 'data') {
                dataSubcategories.style.display = 'flex';
                backendSubcategories.style.display = 'none';
            } else if (tab.dataset.category === 'backend') {
                dataSubcategories.style.display = 'none';
                backendSubcategories.style.display = 'flex';
            }
            
            // Reset active subtab
            const activeSubcategories = tab.dataset.category === 'data' ? 
                dataSubcategories : backendSubcategories;
            const subtabs = activeSubcategories.querySelectorAll('.subtab');
            subtabs.forEach(t => t.classList.remove('active'));
            subtabs[0].classList.add('active');
            
            filterProjects();
        });
    });

    subtabs.forEach(subtab => {
        subtab.addEventListener('click', () => {
            subtabs.forEach(t => t.classList.remove('active'));
            subtab.classList.add('active');
            filterProjects();
        });
    });

    // Add search functionality
    const searchInput = document.getElementById('projectSearch');
    const searchButton = document.getElementById('searchButton');

    searchInput.addEventListener('input', debounce(() => {
        const searchTerm = searchInput.value;
        if (searchTerm.trim() === '') {
            filterProjects(); // Show all projects when search is empty
        } else {
            searchProjects(searchTerm);
        }
    }, 300));

    searchButton.addEventListener('click', () => {
        searchProjects(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProjects(searchInput.value);
        }
    });

    // Add error handling for failed script loading
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ', msg, url, lineNo, columnNo, error);
        displayError('An error occurred while loading the page. Please refresh and try again.');
        return false;
    };

    // Add education tabs functionality
    const educationTabs = document.querySelectorAll('.education-tabs .tab');
    const educationCategories = document.querySelectorAll('.education-category');

    educationTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            educationTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all categories
            educationCategories.forEach(category => {
                category.style.display = 'none';
            });

            // Show selected category
            const selectedCategory = document.querySelector(`.education-category[data-category="${tab.dataset.category}"]`);
            if (selectedCategory) {
                selectedCategory.style.display = 'block';
            }
        });
    });

    // Show degrees by default
    const degreesCategory = document.querySelector('.education-category[data-category="degrees"]');
    if (degreesCategory) {
        degreesCategory.style.display = 'block';
    }

    // Back to top button functionality
    const backToTop = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in class to elements you want to animate
    const animateElements = document.querySelectorAll('section > div, .project-card, .education-item');
    animateElements.forEach(element => {
        element.classList.add('fade-in');
        observer.observe(element);
    });

    // Ensure all images have alt text
    document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('alt')) {
            console.warn('Image missing alt text:', img);
            img.setAttribute('alt', 'Image description needed');
        }
    });
});

async function fetchGitHubProjects() {
    try {
        const response = await fetch('https://api.github.com/users/Caio-Felice-Cunha/repos?per_page=100&sort=created&direction=desc');

        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const projects = await response.json();
        
        if (!Array.isArray(projects)) {
            throw new Error('Invalid response format from GitHub API');
        }

        // Log topics for debugging
        projects.forEach(project => {
            console.log(`${project.name} topics:`, project.topics);
        });

        window.allProjects = projects;
        
        // Display featured projects (latest 6 categorized projects)
        const categorizedProjects = projects.filter(project => categorizeProject(project));
        
        if (categorizedProjects.length > 0) {
            displayFeaturedProjects(categorizedProjects.slice(0, 6));
        }
        
        filterProjects();
    } catch (error) {
        console.error('Error fetching projects:', error);
        displayError(`Error loading projects: ${error.message}. Please try again later.`);
    }
}

function categorizeProject(project) {
    if (project.topics && Array.isArray(project.topics)) {
        // Check for data analysis projects
        if (project.topics.includes('data-analysis') || project.topics.includes('data')) {
            const category = { main: 'data' };
            
            // Check for subcategories
            if (project.topics.includes('python')) {
                category.sub = 'python';
            } else if (project.topics.includes('r')) {
                category.sub = 'r';
            } else if (project.topics.includes('sql')) {
                category.sub = 'sql';
            } else if (project.topics.includes('powerbi')) {
                category.sub = 'powerbi';
            }
            
            return category;
        }
        
        // Check for backend projects
        if (project.topics.includes('backend')) {
            const category = { main: 'backend' };
            
            // Check for subcategories
            if (project.topics.includes('python')) {
                category.sub = 'python';
            } else if (project.topics.includes('go')) {
                category.sub = 'go';
            }
            
            return category;
        }
    }
    
    return null;
}

function filterProjects() {
    if (!window.allProjects) return;

    const activeCategory = document.querySelector('.tab.active').dataset.category;
    const activeSubcategories = document.querySelector(`.${activeCategory}-subcategories`);
    const activeSubtab = activeSubcategories.querySelector('.subtab.active');
    const activeSubcategory = activeSubtab ? activeSubtab.dataset.subcategory : null;
    
    const filteredProjects = window.allProjects.filter(project => {
        const category = categorizeProject(project);
        if (!category) return false;

        if (category.main === activeCategory) {
            return !activeSubcategory || category.sub === activeSubcategory;
        }
        return false;
    });

    displayProjects(filteredProjects);
}

function displayProjects(projects, searchTerm = '') {
    const projectsGrid = document.getElementById('projectsGrid');
    if (!projectsGrid) return;

    projectsGrid.innerHTML = '';

    if (!Array.isArray(projects) || projects.length === 0) {
        projectsGrid.innerHTML = '<p class="no-projects">No projects found matching your search criteria.</p>';
        return;
    }

    projects.forEach(project => {
        const category = categorizeProject(project);
        if (!category) return;

        let name = project.name;
        let description = project.description || 'No description available';

        // Highlight search terms if provided
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            name = name.replace(regex, '<span class="highlight">$1</span>');
            description = description.replace(regex, '<span class="highlight">$1</span>');
        }

        const topicTags = project.topics && project.topics.length > 0
            ? `<div class="category-tags">
                ${project.topics.map(topic => {
                    const topicText = searchTerm && topic.toLowerCase().includes(searchTerm.toLowerCase())
                        ? `<span class="highlight">${topic}</span>`
                        : topic;
                    return `<div class="category-tag">${topicText}</div>`;
                }).join('')}
               </div>`
            : '';

        const card = document.createElement('div');
        card.className = 'project-card';
        
        card.innerHTML = `
            <h3>${name}</h3>
            <p>${description}</p>
            ${topicTags}
            <div class="project-links">
                <a href="${project.html_url}" class="btn" target="_blank">View Project</a>
            </div>
        `;

        projectsGrid.appendChild(card);
    });
}

function displayFeaturedProjects(projects) {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = '';

    projects.forEach(project => {
        const category = categorizeProject(project);
        if (!category) return;

        const card = document.createElement('div');
        card.className = 'featured-card';

        const date = new Date(project.created_at).toLocaleDateString();
        
        card.innerHTML = `
            <div class="date">${date}</div>
            <h3>${project.name}</h3>
            <p>${project.description || 'No description available'}</p>
            <div class="category-tag">${category.main}</div>
            <a href="${project.html_url}" class="btn" target="_blank">View Project</a>
        `;

        featuredGrid.appendChild(card);
    });
}

function searchProjects(searchTerm) {
    if (!window.allProjects) return;

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    if (normalizedSearchTerm === '') {
        filterProjects();
        return;
    }

    const filteredProjects = window.allProjects.filter(project => {
        const name = project.name.toLowerCase();
        const description = (project.description || '').toLowerCase();
        const topics = (project.topics || []).join(' ').toLowerCase();

        return name.includes(normalizedSearchTerm) ||
               description.includes(normalizedSearchTerm) ||
               topics.includes(normalizedSearchTerm);
    });

    // Highlight search terms in the results
    displayProjects(filteredProjects, normalizedSearchTerm);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function displayError(message) {
    const projectsGrid = document.getElementById('projectsGrid');
    const featuredGrid = document.getElementById('featuredGrid');
    
    const errorHTML = `
        <div class="error-message">
            <p>${message}</p>
            <p>If this error persists, you may be experiencing GitHub API rate limiting. Please try again in a few minutes.</p>
            <button onclick="retryFetch()" class="btn">Retry</button>
        </div>
    `;

    if (projectsGrid) {
        projectsGrid.innerHTML = errorHTML;
    }
    
    if (featuredGrid) {
        featuredGrid.innerHTML = errorHTML;
    }
}

// Add this new function to retry fetching
function retryFetch() {
    fetchGitHubProjects();
}

// Add styles for category tags
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .category-tag {
        display: inline-block;
        background-color: var(--primary-color);
        color: white;
        padding: 0.2rem 0.5rem;
        border-radius: 15px;
        font-size: 0.8rem;
        margin: 0.5rem 0;
    }
    .category-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin: 0.5rem 0;
    }
`;
document.head.appendChild(additionalStyles); 