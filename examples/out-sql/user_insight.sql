DROP VIEW IF EXISTS `user_insight` ;
CREATE VIEW `user_insight` AS
SELECT
  `ups`.`user_id` AS `user_id`,
  `ups`.`user_name` AS `user_name`,
  `ups`.`post_count` AS `summary_count`,
  `tu`.`post_count` AS `top_rank_count`
FROM `user_post_summary` AS `ups`
LEFT JOIN `top_users` AS `tu` ON ups.user_id = tu.user_id;