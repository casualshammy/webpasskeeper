<?php

$userfilesPrefix = "webpasskeeper/";
if (!file_exists($userfilesPrefix)) {
    mkdir($userfilesPrefix, 0700, true);
}

function GetPostField($field) {
	$v = htmlspecialchars($_POST[$field]);
	if ($v === "") {
		return null;
	}
	else {
		return $v;
	}
}

/**
 * Generate a random string, using a cryptographically secure 
 * pseudorandom number generator (random_int)
 * 
 * For PHP 7, random_int is a PHP core function
 * For PHP 5.x, depends on https://github.com/paragonie/random_compat
 * 
 * @param int $length      How many characters do we want?
 * @param string $keyspace A string of all possible characters
 *                         to select from
 * @return string
 */
function random_str($length, $keyspace = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    $pieces = [];
    $max = mb_strlen($keyspace, '8bit') - 1;
    for ($i = 0; $i < $length; ++$i) {
        $pieces []= $keyspace[random_int(0, $max)];
    }
    return implode('', $pieces);
}

$postMethod = GetPostField("method");
if ($postMethod === "register") {
	$login = GetPostField("login");
	$hashed_password = GetPostField("hashed_password");
	if ($login === null or $hashed_password === null) {
		http_response_code(403); // Incorrect credentials
		die();
	}
	$newFileName = hash("sha256", $login . $hashed_password);
	if (file_exists($userfilesPrefix . $newFileName)) {
		http_response_code(402); // File already exist
		die();
	}
	file_put_contents($userfilesPrefix . $newFileName, "");
	chmod($userfilesPrefix . $newFileName, 0600);
	echo "OK";
	die();
}
elseif ($postMethod === "get") {
	$login = GetPostField("login");
	$hashed_password = GetPostField("hashed_password");
	if ($login === null or $hashed_password === null) {
		http_response_code(403); // Incorrect credentials
		die();
	}
	$file_name = hash("sha256", $login . $hashed_password);
	$file_contents = file_get_contents($userfilesPrefix . $file_name);
	if ($file_contents === false) {
		http_response_code(404); // Secure file not found
		die();
	}
	echo $file_contents;
}
elseif ($postMethod === "store") {
	$login = GetPostField("login");
	$hashed_password = GetPostField("hashed_password");
	if ($login === null or $hashed_password === null) {
		http_response_code(403); // Incorrect credentials
		die();
	}
	$file_name = hash("sha256", $login . $hashed_password);
	if (file_exists($userfilesPrefix . $file_name) === false) {
		http_response_code(404); // Secure file not found
		die();
	}
	file_put_contents($userfilesPrefix . $file_name, $_POST["data"]);
	chmod($userfilesPrefix . $file_name, 0600);
	echo "OK";
	die();
}
elseif ($postMethod === "get-db-timestamp") {
	$login = GetPostField("login");
	$hashed_password = GetPostField("hashed_password");
	if ($login === null or $hashed_password === null) {
		http_response_code(403); // Incorrect credentials
		die();
	}
	$file_name = hash("sha256", $login . $hashed_password);
	if (file_exists($userfilesPrefix . $file_name) === false) {
		http_response_code(404); // Secure file not found
		die();
	}
	echo filemtime($userfilesPrefix . $file_name);
}


?>