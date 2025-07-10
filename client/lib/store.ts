import { User, Booking, Post, FriendRequest, Follow } from "@shared/api";
import apiClient from "./api";
import React, { useState, useEffect } from "react";

// Ensure React hooks are available
if (typeof useState === "undefined" || typeof useEffect === "undefined") {
  console.error("❌ React hooks are not properly imported in store.ts");
}

// Application State Types
export interface AppState {
  user: User | null;
  barbers: User[];
  bookings: Booking[];
  posts: Post[];
  friendRequests: FriendRequest[];
  follows: Follow[];
  notifications: AppNotification[];
  isLoading: boolean;
}

export interface AppNotification {
  id: string;
  type:
    | "booking_accepted"
    | "booking_rejected"
    | "new_follower"
    | "friend_request"
    | "new_booking"
    | "system"
    | "success"
    | "new_message"
    | "new_rating"
    | "error";
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

// Initial State
const initialState: AppState = {
  user: null,
  barbers: [],
  bookings: [],
  posts: [],
  friendRequests: [],
  follows: [],
  notifications: [],
  isLoading: false,
};

// State Management Class
class AppStore {
  private state: AppState = initialState;
  private listeners: Array<(state: AppState) => void> = [];

  getState(): AppState {
    return { ...this.state };
  }

  setState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  subscribe(listener: (state: AppState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  // User Actions
  setUser(user: User | null) {
    this.setState({ user });
    if (user) {
      localStorage.setItem("barbershop_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("barbershop_user");
      localStorage.removeItem("barbershop_token");
      apiClient.clearAuthToken();
    }
  }

  // Authentication Actions
  async login(email: string, password: string) {
    try {
      this.setLoading(true);
      const response = await apiClient.login(email, password);

      console.log("Login response received:", {
        hasUser: !!response.user,
        hasToken: !!response.token,
        tokenPrefix: response.token?.substring(0, 10) + "...",
        userName: response.user?.name,
      });

      localStorage.setItem("barbershop_token", response.token);
      apiClient.setAuthToken(response.token);
      this.setUser(response.user);

      console.log("Auth token set successfully:", {
        tokenSaved: !!localStorage.getItem("barbershop_token"),
        userSaved: !!localStorage.getItem("barbershop_user"),
      });

      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role: "customer" | "barber" | "admin";
    activation_key?: string;
  }) {
    try {
      this.setLoading(true);
      const response = await apiClient.register(userData);

      localStorage.setItem("barbershop_token", response.token);
      apiClient.setAuthToken(response.token);
      this.setUser(response.user);

      return response;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  logout() {
    this.setUser(null);
    localStorage.removeItem("barbershop_user");
    localStorage.removeItem("barbershop_token");
    apiClient.clearAuthToken();
  }

  // Initialize auth from localStorage
  async initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const savedUser = localStorage.getItem("barbershop_user");
        const savedToken = localStorage.getItem("barbershop_token");

        console.log("Initializing auth from localStorage:", {
          hasSavedUser: !!savedUser,
          hasSavedToken: !!savedToken,
          tokenPrefix: savedToken?.substring(0, 10) + "...",
        });

        if (savedUser && savedToken) {
          try {
            const user = JSON.parse(savedUser);
            apiClient.setAuthToken(savedToken);
            this.setUser(user);

            console.log("Auth initialized successfully:", {
              userName: user.name,
              userRole: user.role,
              tokenSet: true,
            });
          } catch (error) {
            console.error("Error parsing saved user:", error);
            localStorage.removeItem("barbershop_user");
            localStorage.removeItem("barbershop_token");
            apiClient.clearAuthToken();
          }
        } else {
          console.log("No saved auth data found");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        resolve();
      }
    });
  }

  // Barbers Actions
  setBarbers(barbers: User[]) {
    this.setState({ barbers });
  }

  updateBarber(barberId: string, updates: Partial<User>) {
    const barbers = this.state.barbers.map((barber) =>
      barber.id === barberId ? { ...barber, ...updates } : barber,
    );
    this.setState({ barbers });
  }

  // Bookings Actions
  setBookings(bookings: Booking[]) {
    this.setState({ bookings });
  }

  addBooking(booking: Booking) {
    this.setState({
      bookings: [...this.state.bookings, booking],
    });
  }

  updateBooking(bookingId: string, updates: Partial<Booking>) {
    const bookings = this.state.bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, ...updates } : booking,
    );
    this.setState({ bookings });
  }

  // Posts Actions
  setPosts(posts: Post[]) {
    this.setState({ posts });
  }

  addPost(post: Post) {
    this.setState({
      posts: [post, ...this.state.posts],
    });
  }

  // Friend Requests Actions
  setFriendRequests(friendRequests: FriendRequest[]) {
    this.setState({ friendRequests });
  }

  addFriendRequest(request: FriendRequest) {
    this.setState({
      friendRequests: [...this.state.friendRequests, request],
    });
  }

  updateFriendRequest(requestId: string, updates: Partial<FriendRequest>) {
    const friendRequests = this.state.friendRequests.map((request) =>
      request.id === requestId ? { ...request, ...updates } : request,
    );
    this.setState({ friendRequests });
  }

  // Follows Actions
  setFollows(follows: Follow[]) {
    this.setState({ follows });
  }

  addFollow(follow: Follow) {
    this.setState({
      follows: [...this.state.follows, follow],
    });
  }

  removeFollow(followId: string) {
    const follows = this.state.follows.filter(
      (follow) => follow.id !== followId,
    );
    this.setState({ follows });
  }

  // Notifications Actions
  setNotifications(notifications: AppNotification[]) {
    this.setState({ notifications });
  }

  addNotification(notification: AppNotification) {
    this.setState({
      notifications: [notification, ...this.state.notifications],
    });
  }

  markNotificationAsRead(notificationId: string) {
    const notifications = this.state.notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification,
    );
    this.setState({ notifications });
  }

  clearNotifications() {
    this.setState({ notifications: [] });
  }

  // Loading Actions
  setLoading(isLoading: boolean) {
    this.setState({ isLoading });
  }
}

// Create global store instance
export const appStore = new AppStore();

// React Hook for using the store
export function useAppStore(): [AppState, typeof appStore] {
  // Defensive check to ensure useState is available
  if (typeof useState !== "function") {
    console.error("❌ useState is not available in useAppStore");
    // Return a fallback state
    return [appStore.getState(), appStore];
  }

  try {
    const [state, setState] = useState(appStore.getState());

    useEffect(() => {
      const unsubscribe = appStore.subscribe(setState);
      return unsubscribe;
    }, []);

    return [state, appStore];
  } catch (error) {
    console.error("❌ Error in useAppStore:", error);
    // Return fallback state
    return [appStore.getState(), appStore];
  }
}

// Initialize auth on app start
appStore.initializeAuth();
