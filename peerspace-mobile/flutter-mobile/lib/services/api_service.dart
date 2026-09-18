import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {

  // CHANGE this after deployment
  static const String baseUrl =
      "http://10.58.237.59:5000";

  static Future<Map<String, dynamic>> signup(
      String username, String phone) async {

    final response = await http.post(
      Uri.parse("$baseUrl/signup"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "username": username,
        "phone": phone
      }),
    );

    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> sendChatMessage(int userId, int groupId, String message, {List<String> tags = const [], String roomRules = ""}) async {

    final response = await http.post(
      Uri.parse("$baseUrl/api/chat/send"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "user_id": userId,
        "group_id": groupId,
        "message": message,
        "tags": tags,
        "room_rules": roomRules
      }),
    );

    return jsonDecode(response.body);
  }
}