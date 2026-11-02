const servicesImage = document.querySelector('#servicesImage');

const handleImageTransition = function(string) {
    servicesImage.classList.add('veil');
    setTimeout(()=> {
        servicesImage.classList.remove('veil');
    },800);
    setTimeout(()=> {
        servicesImage.src = string;
    },400)
}

// Service photos are handled by services-carousel.js (Instagram carousel per service)
