var stars;
function showRating () {
    var radios = document.getElementsByName('rating');

    for (var i = 0, length = radios.length; i < length; i++)
    {
        if (radios[i].checked)
        {
            // Here we're gonna pass the radio value to php
            stars = radios[i].value;

            // Only one radio can be logically checked, don't check the rest
            break;
        }
    }
}

var element = document.getElementById('comments');
var retractsAutomatically = false;

var sizeOfOne = element.clientHeight;
element.rows = 2;
var sizeOfExtra = element.clientHeight - sizeOfOne;
element.rows = 1;

var resize = function() {
    var length = element.scrollHeight;

    if (retractsAutomatically) {
        if (element.clientHeight == length)
            return;
    }
    else {
        element.rows = 1;
        length = element.scrollHeight;
    }

    element.rows = 1 + (length - sizeOfOne) / sizeOfExtra;
};

//modern
if (element.addEventListener)
    element.addEventListener('input', resize, false);
//IE8
else {
    element.attachEvent('onpropertychange', resize)
    retractsAutomaticaly = true;
}