
const navbar = document.createElement('nav');
navbar.className = 'navbar';


navbar.style.backgroundColor = '#74428a';


navbar.style.height = '50px';

navbar.style.width = '100%';

navbar.style.position = 'fixed';

navbar.style.top = '0';

navbar.style.left = '0';


navbar.style.zIndex = '1';




const homeLink = document.createElement('a');
homeLink.href = 'index.html';
homeLink.textContent = 'Home';

const myProjectsLink = document.createElement('a');
myProjectsLink.href = 'MyProjects.html';
myProjectsLink.textContent = 'My Projects';

const aboutMeLink = document.createElement('a');
aboutMeLink.href = 'AboutMe.html';
aboutMeLink.textContent = 'About Me';

const contactMeLink = document.createElement('a');
contactMeLink.href = 'ContactMe.html';
contactMeLink.textContent = 'Contact Me';

const links = navbar.querySelectorAll('a');
for (const link of links) {
  link.style.color = 'white';
  link.style.textDecoration = 'none';
  link.style.padding = '10px';
}

navbar.appendChild(homeLink);
navbar.appendChild(myProjectsLink);
navbar.appendChild(aboutMeLink);
navbar.appendChild(contactMeLink);


document.body.appendChild(navbar);