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

const testimonials = document.querySelectorAll('.testimonial');
const left = document.querySelector('.left');
const right = document.querySelector('.right');
let index = 0;

const handleLeft = function() {
    if (index === 0) {
        index = testimonials.length-1;
    } else {
        index--;
    }
    setActive();
    clearInterval(testimonialScroll);
}

left.addEventListener('click', ()=> {
    handleLeft();
})

const handleRight = function() {
    if (index === testimonials.length-1) {
        index = 0;
    } else {
        index++;
    }
    setActive();
    clearInterval(testimonialScroll);
}

right.addEventListener('click', ()=> {
    handleRight();
})

const setActive = function() {
    testimonials.forEach(item => {
        item.classList.remove('active');
    });
    testimonials[index].classList.add('active');
}

const testimonialScroll = setInterval(()=> {
    if (index === testimonials.length - 1) {
        index = 0;
    } else {
        index++;
    }
    setActive();
},8000);