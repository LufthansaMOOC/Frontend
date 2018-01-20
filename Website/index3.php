<?php
// This is to pull the url of the site when it's hosted
//$urlPost = 'http://' . $_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI'];

// Current placeholder for this is 9Gag for now !
$urlPost = "https://9gag.com";

if(isset($_POST['submit']))
{
    $table = "reviews";
    $name = page_title($urlPost);
    $star = $_POST['rating'];
    $review = htmlspecialchars($_POST['comment']);

    try {
        $db = new PDO('mysql:host=localhost;dbname=lufthansa_mooc_review;charset=utf8mb4', 'root', '');
        $db->setAttribute( PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION );//Error Handling
        $sql ="INSERT INTO $table(ID,Course_Name,StarRating,Review) VALUES (0,'$name','$star','$review');" ;
        $db->exec($sql);


    } catch(PDOException $e) {
        echo $e->getMessage();
    }
}

function page_title($url) {
    $fp = file_get_contents($url);
    if (!$fp)
        return null;

    $res = preg_match("/<title>(.*)<\/title>/siU", $fp, $title_matches);
    if (!$res)
        return null;

    $title = preg_replace('/\s+/', ' ', $title_matches[1]);
    $title = trim($title);
    return $title;
}

$avgRating;

try{
    $pdo = new PDO(
        'mysql:host=localhost;
        dbname=lufthansa_mooc_review;
        charset=utf8mb4',
        'root',
        '');



    $sql = 'SELECT  
        StarRating
        FROM `reviews`';

    $q = $pdo->prepare($sql);
    $q->setFetchMode(PDO::FETCH_ASSOC);
    $q->execute();


}
catch(PDOException $e) {
    echo $e->getMessage();
}

//Fetch the reviews

try{$pdo = new PDO(
    'mysql:host=localhost;
    dbname=lufthansa_mooc_review;
    charset=utf8mb4',
    'root',
    '');

    $sql = 'SELECT ID,
        Course_Name, 
        StarRating, 
        review 
        FROM `reviews`';



    $q = $pdo->prepare($sql);
    $q->setFetchMode(PDO::FETCH_ASSOC);
    $q->execute();


} catch(PDOException $e) {
    echo $e->getMessage();
}

function getAvgRating(){

    // Creating the connection to DataBase
    $pdo = new PDO(
        'mysql:host=localhost;
        dbname=lufthansa_mooc_review;
        charset=utf8mb4',
        'root',
        '');

    // Writing the SQL statement
    $sql = 'SELECT ID,
        Course_Name, 
        StarRating, 
        review 
        FROM `reviews`';

    // Execute SQL Statement
    $q = $pdo->prepare($sql);
    $q->setFetchMode(PDO::FETCH_ASSOC);
    $q->execute();

    $avg = 0;
    // Gather all the values
    while($col = $q->fetch()){
        $avg += htmlspecialchars($col['StarRating']);
    }

    // Return the gathered values divided by number of rows. Average Number
    return $avg/($q->rowCount());
}

// FXN to fill the bar according to the pulled ratings
function percentBar($Rating){
    $max = 5; // Number of stars

// Get Percentage out of 100
    if ( !empty($max) ) { $percent = ($Rating * 100) / $max; }
    else { $percent = 0; }

// Limit to 100 percent (if more than the max is allowed)
    if ( $percent > 100 ) { $percent = 100; }

    return $percent;
}

function showStarRating($Rating){
    $returningStars = "Star: ";
    $count = 1;
    while ($count >= 5){

        if($count > $Rating){
            $returningStars += "Checked";
        }
        else{
            $returningStars = "UnChecked";
        }
        $count ++;
    }
    return $returningStars;

}
?>