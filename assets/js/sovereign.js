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

// Each service button carries its photo in data-image
document.querySelectorAll('#accordionExample .accordion-button[data-image]').forEach(btn => {
    btn.addEventListener('click', () => {
        handleImageTransition(btn.dataset.image);
    });
});
