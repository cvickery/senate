<?php
/**
 *  Checks for magic_quotes_gpc = On and strips them from incoming
 *  requests if necessary. From PHP Anthology 2.
 *  2007-11-18: Modified by ccv to recurse arrays using code from
 *  stripslashes documentation.
 */
 
//	stripslashes_deep()
//	------------------------------------------------------------------
/*	Recursively strip slashes from array elements.
 */
	function stripslashes_r($value)
	{
		$value = is_array($value) ?
								array_map('stripslashes_r', $value) :
								stripslashes($value);
		return $value;
	}

//	htmlspecial_deep()
//	-----------------------------------------------------------------
/*	Recursively run htmlspecialchars() on array elements.
 */
	function htmlspecial_r($value)
	{
		$value = is_array($value) ?
								array_map('htmlspecial_r', $value) :
								htmlspecialchars($value, ENT_QUOTES);
		return $value;
	} 

if (get_magic_quotes_gpc())
{
	//  Magic Quotes is On, there is work to do
  $_GET    = array_map('stripslashes_r', $_GET);
  $_POST   = array_map('stripslashes_r', $_POST);
  $_COOKIE = array_map('stripslashes_r', $_COOKIE);
}

//	Now convert html and sql special characters to character entities

array_map('htmlspecial_r', $_GET);
array_map('htmlspecial_r', $_POST);
array_map('htmlspecial_r', $_COOKIE);

?>
