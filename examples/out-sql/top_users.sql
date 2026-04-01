DROP VIEW IF EXISTS `top_users` ;
CREATE VIEW `top_users` AS
SELECT
  `ups`.`user_id` AS `user_id`,
  `ups`.`user_name` AS `user_name`,
  `ups`.`post_count` AS `post_count`
FROM `user_post_summary` AS `ups`

WHERE post_count > 0


 ORDER BY post_count DESC;