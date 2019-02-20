<?php
//	get_all_names.php
/*	Echos a json-encoded array containing the id numbers, names, and faculty status of
 *	everyone in the senate database.
 */
	header("Cache-Control: no-cache");
	header("Expires: 0");

	class Person
 	{
	 	public $person_id;
	 	public $name;
	 	public $is_faculty;
	 	function __construct($id, $first_name, $last_name, $is_faculty)
	 	{
		 	$this->person_id = $id;
		 	$this->name = preg_replace("/ +/", " ", trim($first_name . " " . $last_name));
			$this->is_faculty = ($is_faculty == 't') ? true : false;
	 	}
 	}
 	$return_value = array();
 	$conn = pg_connect("dbname=senate user=web_user");
 	$result = pg_query($conn, "SELECT id, first_name, last_name, is_faculty FROM people ORDER BY last_name");
 	while ($row = pg_fetch_assoc($result))
 	{
		$return_value[] = new Person($row['id'], $row['first_name'], $row['last_name'], $row['is_faculty']);
 	}
 	echo json_encode($return_value);