<?php

echo "<h1> sendmail_path is now " . ini_get('sendmail_path') . "</h1>\n<pre>\n";

require_once("PHPMailerAutoload.php");

//Create a new PHPMailer instance
$mail = new PHPMailer();

#$mail->isSendmail(true);
#$mail->Host = 'mymail.qc.cuny.edu';
#$mail->Port = intval('465');

//Set who the message is to be sent from
$mail->setFrom('Christopher.Vickery@qc.cuny.edu', 'Me Myself');
//Set an alternative reply-to address
$mail->addReplyTo('vickery@babbage.cs.qc.cuny.edu', 'Senate Robot');
//Set who the message is to be sent to
$mail->addAddress('Christopher.Vickery@qc.cuny.edu', 'Christopher Vickery');
$mail->addCC('cvickery@gmail.com', 'Chris Vickery');
//$mail->addAddress('Yan.Juras@qc.cuny.edu', 'Yan Juras');
$mail->addBCC('vickery@babbage.cs.qc.cuny.edu', 'Professor Vickery');
//Set the subject line
$mail->Subject = 'PHPMailer mail() test';
//Read an HTML message body from an external file, convert referenced images to embedded,
//convert HTML into a basic plain-text alternative body
$msg = <<<EOD
<h1>SMTP Works</h1>

This is from my test program. Seems to work, although I seem to have some error messages from
before that keep dribbling out.

Chris
EOD;
$mail->msgHTML("<h1>SMTP Works</h1>");
//Replace the plain text body with one created manually
$mail->AltBody = 'SMTP working is desireable';
//Attach an image file
//$mail->addAttachment('images/phpmailer_mini.gif');

//send the message, check for errors
if (!$mail->send())
{
    echo "Mailer Error: " . $mail->ErrorInfo;
}
else
{
  echo "Message sent!";
}
echo "</pre>\n";
?>
